import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { INPUT_RESET, SPACE, RADIUS, TYPE, useTheme } from '../theme';
import { useLibrary } from '../hooks/useLibrary';
import { useMovieSearch } from '../hooks/useMovieSearch';
import { searchableFilms } from '../lib/library';
import {
  mutateAnnualLists,
  updateFilmPoster,
  resolvePoster,
  type AnnualList,
  type EntryStatus,
  type WatchItem,
} from '../lib/library';
import type { Movie } from '../api/movies';
import { yearOf } from '../lib/format';
import { confirmAction } from '../lib/ui';
import { AppHeader } from '../components/AppHeader';
import { EmptyState } from '../components/EmptyState';
import { Poster } from '../components/Poster';
import { PosterPicker } from '../components/PosterPicker';
import { Chip } from '../components/Chip';
import { StatusPill } from '../components/StatusPill';
import { ActionButton } from '../components/ActionButton';

const STATUSES: EntryStatus[] = ['planned', 'watched', 'skipped', 'postponed'];

interface DetailState {
  listYear: number;
  item: WatchItem;
}

export default function WatchlistScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { library, loading, refresh } = useLibrary();

  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [addOpen, setAddOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [detail, setDetail] = useState<DetailState | null>(null);
  const [busy, setBusy] = useState(false);

  const years = useMemo(() => {
    const set = new Set<number>(library.annual.map((list) => list.year));
    set.add(new Date().getFullYear());
    set.add(selectedYear);
    return Array.from(set).sort((a, b) => b - a);
  }, [library.annual, selectedYear]);

  const currentList: AnnualList | undefined = library.annual.find(
    (list) => list.year === selectedYear
  );
  const movies = currentList?.movies ?? [];
  const watchedCount = movies.filter((movie) => movie.status === 'watched').length;
  const progress = movies.length > 0 ? watchedCount / movies.length : 0;
  const watchedPct = Math.round(progress * 100);

  const gridGap = 10;
  const contentWidth = Math.max(0, Math.min(width, 720) - 24);
  const columns = contentWidth >= 600 ? 5 : contentWidth >= 380 ? 4 : 3;
  const cardWidth = Math.floor((contentWidth - gridGap * (columns - 1)) / columns);

  const searchable = useMemo(() => searchableFilms(library), [library]);
  const { results: searchHits } = useMovieSearch(search, searchable);
  const searchResults = search.trim() ? searchHits : searchable.slice(0, 12);

  const closeAdd = () => {
    setAddOpen(false);
    setSearch('');
  };

  const addMovie = async (movie: Movie) => {
    if (busy) return;
    setBusy(true);
    try {
      let added = false;
      await mutateAnnualLists((lists) => {
        const index = lists.findIndex((list) => list.year === selectedYear);
        const baseList: AnnualList =
          index >= 0
            ? lists[index]
            : { id: `year-${selectedYear}`, year: selectedYear, title: `${selectedYear} Watchlist`, movies: [] };

        if (baseList.movies.some((item) => item.movieId === movie.id)) return lists;

        const item: WatchItem = {
          id: `${movie.id}-${Date.now()}`,
          movieId: movie.id,
          title: movie.title,
          posterPath: movie.posterPath,
          year: selectedYear,
          status: 'planned',
          addedAt: new Date().toISOString(),
        };
        added = true;
        const updatedList: AnnualList = { ...baseList, movies: [...baseList.movies, item] };
        return index >= 0
          ? lists.map((list, i) => (i === index ? updatedList : list))
          : [...lists, updatedList];
      });

      await refresh();
      if (added) closeAdd();
    } finally {
      setBusy(false);
    }
  };

  const updateStatus = async (status: EntryStatus) => {
    if (!detail) return;
    setBusy(true);
    try {
      await mutateAnnualLists((lists) =>
        lists.map((list) =>
          list.year === detail.listYear
            ? {
                ...list,
                movies: list.movies.map((item) =>
                  item.movieId === detail.item.movieId ? { ...item, status } : item
                ),
              }
            : list
        )
      );
      await refresh();
      setDetail({ ...detail, item: { ...detail.item, status } });
    } finally {
      setBusy(false);
    }
  };

  const moveToNextYear = async () => {
    if (!detail) return;
    setBusy(true);
    try {
      const targetYear = detail.listYear + 1;
      const movedItem: WatchItem = { ...detail.item, year: targetYear, status: 'planned' };

      await mutateAnnualLists((lists) => {
        const sourceIndex = lists.findIndex((list) => list.year === detail.listYear);
        if (sourceIndex < 0) return lists;

        const source = lists[sourceIndex];
        const targetIndex = lists.findIndex((list) => list.year === targetYear);
        const target: AnnualList =
          targetIndex >= 0
            ? lists[targetIndex]
            : { id: `year-${targetYear}`, year: targetYear, title: `${targetYear} Watchlist`, movies: [] };

        let updated = lists.map((list, i) =>
          i === sourceIndex
            ? { ...source, movies: source.movies.filter((m) => m.movieId !== detail.item.movieId) }
            : i === targetIndex
              ? { ...target, movies: [...target.movies, movedItem] }
              : list
        );
        if (targetIndex < 0) {
          updated = [...updated, { ...target, movies: [movedItem] }];
        }
        return updated;
      });

      await refresh();
      setSelectedYear(targetYear);
      setDetail(null);
    } finally {
      setBusy(false);
    }
  };

  const removeMovie = () => {
    if (!detail) return;
    const { listYear, item } = detail;
    confirmAction('Remove film', `Remove “${item.title}” from your ${listYear} watchlist?`, async () => {
      await mutateAnnualLists((lists) =>
        lists.map((list) =>
          list.year === listYear
            ? { ...list, movies: list.movies.filter((m) => m.movieId !== item.movieId) }
            : list
        )
      );
      await refresh();
      setDetail(null);
    });
  };

  const manualTitle = search.trim();

  // Films not in the database are added on their own screen, then found by search.
  const addManually = () => {
    if (!manualTitle) return;
    closeAdd();
    router.navigate({ pathname: '/add-movie', params: { title: manualTitle } });
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingBottom: 36,
          width: '100%',
          maxWidth: 720,
          alignSelf: 'center',
        }}
      >
        <AppHeader />

        <View style={styles.topRow}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.yearScroller}
            contentContainerStyle={styles.yearRow}
          >
            {years.map((year) => (
              <Chip
                key={year}
                compact
                label={String(year)}
                active={selectedYear === year}
                onPress={() => setSelectedYear(year)}
              />
            ))}
          </ScrollView>
          <ActionButton
            label="Add a film"
            icon="add"
            compact
            style={styles.addButton}
            onPress={() => setAddOpen(true)}
          />
        </View>

        <View
          style={[styles.progressStrip, { backgroundColor: colors.surface, borderColor: colors.borderSoft }]}
        >
          <Ionicons name="bookmark" size={14} color={colors.coralInk} />
          <Text style={[styles.progressLabel, { color: colors.text }]} numberOfLines={1}>
            {watchedCount}/{movies.length} watched
          </Text>
          <View style={[styles.progressTrack, { backgroundColor: colors.surfaceAlt }]}>
            <View
              style={[
                styles.progressFill,
                { width: `${watchedPct}%`, backgroundColor: colors.primary },
              ]}
            />
          </View>
          <Text style={[styles.progressPct, { color: colors.coralInk }]}>{watchedPct}%</Text>
        </View>

        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.accent} />
          </View>
        ) : movies.length === 0 ? (
          <View style={styles.emptyWrap}>
            <EmptyState
              compact
              icon="bookmark-outline"
              title={`Nothing in ${selectedYear} yet`}
              message="Add the films you want to watch this year and track them as you go."
            />
          </View>
        ) : (
          <View style={[styles.grid, { gap: gridGap }]}>
            {movies.map((movie) => (
              <Pressable
                key={movie.id}
                style={({ pressed }) => [
                  styles.gridItem,
                  { width: cardWidth },
                  pressed && { opacity: 0.8 },
                ]}
                onPress={() => setDetail({ listYear: selectedYear, item: movie })}
                accessibilityRole="button"
                accessibilityLabel={movie.title}
              >
                <Poster
                  uri={resolvePoster(library, movie.movieId, movie.title) ?? movie.posterPath}
                  title={movie.title}
                  width={cardWidth}
                  radius={RADIUS.md}
                >
                  <View style={styles.posterStatus}>
                    <StatusPill status={movie.status} small />
                  </View>
                </Poster>
                <Text style={[styles.movieTitle, { color: colors.text }]} numberOfLines={2}>
                  {movie.title}
                </Text>
                <Text style={[styles.movieMeta, { color: colors.textMuted }]}>
                  {movie.year || selectedYear}
                </Text>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>

      <Modal visible={addOpen} animationType="slide" transparent onRequestClose={closeAdd}>
        <View style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}>
          <View
            style={[
              styles.sheet,
              { backgroundColor: colors.backgroundAlt, borderColor: colors.borderSoft, paddingBottom: insets.bottom + SPACE.lg },
            ]}
          >
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <View style={styles.flex}>
                <Text style={[styles.sheetTitle, { color: colors.text }]}>Add to {selectedYear}</Text>
              </View>
              <Pressable onPress={closeAdd} accessibilityLabel="Close" hitSlop={8}>
                <Ionicons name="close" size={22} color={colors.textMuted} />
              </Pressable>
            </View>

            <View style={[styles.searchRow, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
              <Ionicons name="search" size={17} color={colors.textDim} />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Search films by title…"
                placeholderTextColor={colors.textDim}
                style={[styles.searchInput, { color: colors.text }]}
                autoCorrect={false}
              />
            </View>

            <ScrollView style={styles.resultsList} keyboardShouldPersistTaps="handled">
              {searchResults.length === 0 ? null : (
                searchResults.map((movie) => {
                  const already = movies.some((item) => item.movieId === movie.id);
                  return (
                    <Pressable
                      key={movie.id}
                      disabled={already || busy}
                      onPress={() => addMovie(movie)}
                      style={({ pressed }) => [
                        styles.resultRow,
                        { borderColor: colors.borderSoft },
                        pressed && { opacity: 0.7 },
                      ]}
                    >
                      <Poster uri={movie.posterPath} title={movie.title} width={36} radius={RADIUS.sm} />
                      <View style={styles.flex}>
                        <Text style={[styles.resultTitle, { color: colors.text }]} numberOfLines={1}>
                          {movie.title}
                        </Text>
                        <Text style={[styles.resultMeta, { color: colors.textDim }]}>
                          {movie.releaseDate ? yearOf(movie.releaseDate) : '—'}
                        </Text>
                      </View>
                      <Ionicons
                        name={already ? 'checkmark-circle' : 'add-circle'}
                        size={20}
                        color={already ? colors.teal : colors.accent}
                      />
                    </Pressable>
                  );
                })
              )}

              {searchResults.length === 0 && manualTitle.length > 0 ? (
                <Pressable
                  onPress={addManually}
                  style={({ pressed }) => [styles.manualRow, { borderColor: colors.border }, pressed && { opacity: 0.7 }]}
                >
                  <Ionicons name="add-circle-outline" size={17} color={colors.accent} />
                  <Text style={[styles.manualText, { color: colors.text }]} numberOfLines={1}>
                    Add “{manualTitle}” manually
                  </Text>
                </Pressable>
              ) : null}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={Boolean(detail)} animationType="slide" transparent onRequestClose={() => setDetail(null)}>
        <View style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}>
          <View
            style={[
              styles.sheet,
              { backgroundColor: colors.backgroundAlt, borderColor: colors.borderSoft, paddingBottom: insets.bottom + SPACE.lg },
            ]}
          >
            <View style={styles.sheetHandle} />
            {detail ? (
              <>
                <View style={styles.sheetHeader}>
                  <Text style={[styles.sheetTitle, { color: colors.text }]}>{detail.listYear} film</Text>
                  <Pressable onPress={() => setDetail(null)} accessibilityLabel="Close" hitSlop={8}>
                    <Ionicons name="close" size={22} color={colors.textMuted} />
                  </Pressable>
                </View>

                <View style={styles.detailTop}>
                  <PosterPicker
                    uri={resolvePoster(library, detail.item.movieId, detail.item.title) ?? detail.item.posterPath}
                    title={detail.item.title}
                    movieId={detail.item.movieId}
                    width={80}
                    onChange={async (uri) => {
                      await updateFilmPoster(detail.item.movieId, detail.item.title, uri);
                      await refresh();
                      setDetail({ ...detail, item: { ...detail.item, posterPath: uri } });
                    }}
                  />
                  <View style={styles.detailInfo}>
                    <Text style={[styles.detailTitle, { color: colors.text }]}>{detail.item.title}</Text>
                    <Text style={[styles.detailMeta, { color: colors.textDim }]}>
                      {detail.item.year || detail.listYear}
                    </Text>
                    <View style={{ marginTop: SPACE.xs }}>
                      <StatusPill status={detail.item.status} />
                    </View>
                  </View>
                </View>

                <Text style={[styles.detailLabel, { color: colors.textDim }]}>Update status</Text>
                <View style={styles.statusChips}>
                  {STATUSES.map((status) => (
                    <Chip
                      compact
                      key={status}
                      label={status.charAt(0).toUpperCase() + status.slice(1)}
                      active={detail.item.status === status}
                      onPress={() => updateStatus(status)}
                    />
                  ))}
                </View>

                <View style={styles.detailActions}>
                  <ActionButton
                    compact
                    label={`Move to ${detail.listYear + 1}`}
                    icon="arrow-forward"
                    variant="ghost"
                    onPress={moveToNextYear}
                    style={styles.detailButton}
                  />
                  <ActionButton
                    compact
                    label="Remove"
                    icon="trash-outline"
                    variant="danger"
                    onPress={removeMovie}
                    style={styles.detailButton}
                  />
                </View>
                {busy ? <ActivityIndicator color={colors.accent} style={{ marginTop: SPACE.sm }} /> : null}
              </>
            ) : null}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  addButton: {
    minHeight: 32,
    paddingHorizontal: 12,
    marginLeft: 8,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 12,
    marginTop: 10,
    marginBottom: 8,
  },
  yearScroller: {
    flex: 1,
    flexGrow: 1,
  },
  yearRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 6,
  },
  progressStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 12,
    marginBottom: 10,
    paddingHorizontal: 12,
    height: 40,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: '#142A45',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },
  progressLabel: {
    fontSize: 12.5,
    fontWeight: '800',
    letterSpacing: -0.1,
  },
  progressTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressPct: {
    minWidth: 32,
    textAlign: 'right',
    fontSize: 12,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  loading: {
    paddingTop: SPACE.xl,
    alignItems: 'center',
  },
  emptyWrap: {
    paddingHorizontal: 12,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
  },
  gridItem: {
    maxWidth: '100%',
  },
  posterStatus: {
    position: 'absolute',
    left: 6,
    bottom: 6,
  },
  movieTitle: {
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '800',
    letterSpacing: -0.1,
    marginTop: 6,
    minHeight: 30,
  },
  movieMeta: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '600',
    marginTop: 1,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '88%',
    borderTopLeftRadius: RADIUS.lg,
    borderTopRightRadius: RADIUS.lg,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: SPACE.lg,
    paddingTop: SPACE.sm,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 36,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(128,128,128,0.4)',
    marginBottom: SPACE.sm,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACE.md,
    marginBottom: SPACE.sm,
  },
  sheetTitle: {
    ...TYPE.heading,
    fontSize: 16,
  },
  sheetSubtitle: {
    ...TYPE.caption,
    marginTop: 2,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.sm,
    paddingHorizontal: SPACE.md,
    minHeight: 42,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  searchInput: {
    ...TYPE.body,
    ...INPUT_RESET,
    flex: 1,
    padding: 0,
  },
  resultsList: {
    marginTop: SPACE.md,
    marginBottom: SPACE.md,
  },
  emptyResults: {
    ...TYPE.small,
    textAlign: 'center',
    paddingVertical: SPACE.lg,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.md,
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  resultTitle: {
    ...TYPE.small,
    fontWeight: '700',
  },
  resultMeta: {
    ...TYPE.caption,
    marginTop: 2,
  },
  manualRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.sm,
    marginTop: SPACE.sm,
    paddingVertical: 10,
    paddingHorizontal: SPACE.md,
    borderRadius: RADIUS.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderStyle: 'dashed',
  },
  manualText: {
    ...TYPE.small,
    fontWeight: '700',
    flex: 1,
  },
  manualBox: {
    marginTop: SPACE.md,
    padding: SPACE.md,
    borderRadius: RADIUS.lg,
    borderWidth: StyleSheet.hairlineWidth,
    gap: SPACE.md,
  },
  manualTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.md,
  },
  manualTitle: {
    ...TYPE.small,
    fontWeight: '800',
  },
  detailTop: {
    flexDirection: 'row',
    gap: SPACE.md,
    marginBottom: SPACE.md,
  },
  detailInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  detailTitle: {
    ...TYPE.heading,
  },
  detailMeta: {
    ...TYPE.caption,
    marginTop: 4,
  },
  detailLabel: {
    ...TYPE.eyebrow,
    fontSize: 9.5,
    letterSpacing: 1.2,
    marginBottom: SPACE.xs,
  },
  statusChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: SPACE.md,
  },
  detailActions: {
    flexDirection: 'row',
    gap: 6,
  },
  detailButton: {
    flex: 1,
    minHeight: 40,
    borderRadius: 10,
  },
});
