import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { INPUT_RESET, SPACE, RADIUS, NUMBER_FONT, TYPE, useTheme } from '../theme';
import { useLibrary } from '../hooks/useLibrary';
import { useMovieSearch } from '../hooks/useMovieSearch';
import { searchableFilms } from '../lib/library';
import {
  mutateAnnualLists,
  type AnnualList,
  type EntryStatus,
  type WatchItem,
} from '../lib/library';
import type { Movie } from '../api/movies';
import { yearOf } from '../lib/format';
import { notify } from '../lib/ui';
import { AppHeader } from '../components/AppHeader';
import { EmptyState } from '../components/EmptyState';
import { Poster } from '../components/Poster';
import { ActionButton } from '../components/ActionButton';

// Colours of the status label shown beside films that are not watched yet.
const STATUS_COLORS: Record<EntryStatus, string> = {
  planned: '#3B5F94',
  watched: '#2F7D5B',
  skipped: '#B4533F',
};
const STATUS_LABELS: Record<EntryStatus, string> = {
  planned: 'Planned',
  watched: 'Watched',
  skipped: 'Skipped',
};

export default function WatchlistScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { library, loading, refresh } = useLibrary();

  const currentYear = new Date().getFullYear();
  // Filters the films shown in the list (separate from the search inside the add card).
  const [listQuery, setListQuery] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [search, setSearch] = useState('');
  // The year the film is added to. Starts as the current year; the user can type any other year.
  const [addYear, setAddYear] = useState(String(new Date().getFullYear()));
  const [busy, setBusy] = useState(false);

  // Every year that has films, newest first. The search box filters the films inside each year.
  const sections = useMemo(() => {
    const needle = listQuery.trim().toLowerCase();
    return library.annual
      .map((list) => ({
        year: list.year,
        total: list.movies.length,
        watched: list.movies.filter((movie) => movie.status === 'watched').length,
        // Films inside each year are listed alphabetically.
        items: (needle
          ? list.movies.filter((movie) => movie.title.toLowerCase().includes(needle))
          : [...list.movies]
        ).sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base', numeric: true })),
      }))
      .filter((section) => section.items.length > 0)
      .sort((a, b) => b.year - a.year);
  }, [library.annual, listQuery]);

  // With no films in any year there is nothing to search, so only the "Add film" card shows.
  const noWatchlist = library.annual.every((list) => list.movies.length === 0);

  // Tick the circle to mark a film watched; tick it again to put it back to planned.
  const toggleWatched = async (year: number, movie: WatchItem) => {
    if (busy) return;
    setBusy(true);
    try {
      const status: EntryStatus = movie.status === 'watched' ? 'planned' : 'watched';
      await mutateAnnualLists((lists) =>
        lists.map((list) =>
          list.year === year
            ? {
                ...list,
                movies: list.movies.map((item) =>
                  item.movieId === movie.movieId ? { ...item, status } : item
                ),
              }
            : list
        )
      );
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const searchable = useMemo(() => searchableFilms(library), [library]);
  const { results: searchHits } = useMovieSearch(search, searchable);
  // A film can be on only one year's watchlist. Nothing is suggested until something is typed,
  // and films already on any year's list are left out (move or remove them to add them again).
  const onWatchlist = useMemo(
    () => new Set(library.annual.flatMap((list) => list.movies.map((item) => item.movieId))),
    [library.annual]
  );
  // Suggestions only appear once at least three characters are typed.
  const searching = search.trim().length >= 3;
  const searchResults = searching ? searchHits.filter((hit) => !onWatchlist.has(hit.id)) : [];
  // True when what was typed is exactly the title of a film that is already on a watchlist.
  const typedTitle = search.trim().toLowerCase();
  const typedExactlyOnList = searchHits.some(
    (hit) => onWatchlist.has(hit.id) && hit.title.trim().toLowerCase() === typedTitle
  );

  const closeAdd = () => {
    setAddOpen(false);
    setSearch('');
    setAddYear(String(currentYear));
  };

  const addMovie = async (movie: Movie) => {
    if (busy) return;
    const targetYear = Number(addYear);
    if (!/^\d{4}$/.test(addYear.trim()) || targetYear < 1900 || targetYear > currentYear + 10) {
      notify('Check the year', `Enter a year between 1900 and ${currentYear + 10} for the watchlist.`);
      return;
    }
    // A film cannot be on a watchlist for a year before it was released.
    const releaseYear = movie.releaseDate ? Number(yearOf(movie.releaseDate)) : NaN;
    if (Number.isFinite(releaseYear) && releaseYear > targetYear) {
      notify(
        'Not released yet',
        `“${movie.title}” is a ${releaseYear} film, so it cannot be added to your ${targetYear} watchlist.`
      );
      return;
    }
    setBusy(true);
    try {
      let added = false;
      await mutateAnnualLists((lists) => {
        const index = lists.findIndex((list) => list.year === targetYear);
        const baseList: AnnualList =
          index >= 0
            ? lists[index]
            : { id: `year-${targetYear}`, year: targetYear, title: `${targetYear} Watchlist`, movies: [] };

        // Already on a watchlist (this year or any other): do not add it a second time.
        if (lists.some((list) => list.movies.some((item) => item.movieId === movie.id))) return lists;

        const item: WatchItem = {
          id: `${movie.id}-${Date.now()}`,
          movieId: movie.id,
          title: movie.title,
          posterPath: movie.posterPath,
          year: targetYear,
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

  // The year stepper moves the watchlist year one at a time, within the same limits addMovie checks.
  const minYear = currentYear; // the stepper never goes to a past year
  const maxYear = currentYear + 10;
  const shownYear = /^\d{4}$/.test(addYear.trim()) ? Number(addYear) : currentYear;
  const stepYear = (by: number) => setAddYear(String(Math.min(maxYear, Math.max(minYear, shownYear + by))));

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <AppHeader title="Watchlist" subtitle="Films you plan to watch, by year." />

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
        {loading || noWatchlist ? null : (
          <>
            {/* Search on the left, add button on the right */}
            <View style={styles.topRow}>
              <View style={[styles.listSearch, { backgroundColor: colors.backgroundAlt, borderColor: colors.borderSoft }]}>
                <Ionicons name="search" size={16} color={colors.textMuted} />
                <TextInput
                  value={listQuery}
                  onChangeText={setListQuery}
                  placeholder="Search your watchlist"
                  placeholderTextColor={colors.textMuted}
                  autoCorrect={false}
                  accessibilityLabel="Search your watchlist"
                  style={[styles.listSearchInput, INPUT_RESET, { color: colors.text }]}
                />
              </View>
              <ActionButton
                label="Add film"
                icon="add"
                compact
                style={styles.addButton}
                onPress={() => setAddOpen(true)}
              />
            </View>
          </>
        )}

        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.accent} />
          </View>
        ) : sections.length === 0 ? (
          <View style={styles.emptyWrap}>
            <EmptyState
              icon="bookmark-outline"
              title={listQuery.trim() ? 'No matching films' : `Nothing in ${currentYear} yet`}
              message={
                listQuery.trim()
                  ? undefined
                  : 'Add the films you want to watch this year and track them as you go.'
              }
              actionLabel={noWatchlist ? 'Add film' : undefined}
              onAction={noWatchlist ? () => setAddOpen(true) : undefined}
            />
          </View>
        ) : (
          sections.map((section) => {
            const pct = section.total > 0 ? Math.round((section.watched / section.total) * 100) : 0;
            return (
              <View key={section.year} style={styles.yearBlock}>
                <View style={styles.yearHeader}>
                  <Text style={[styles.yearTitle, { color: colors.text }]}>{section.year}</Text>
                  <Text style={[styles.yearCount, { color: colors.textMuted }]}>
                    {section.watched} of {section.total}
                  </Text>
                </View>
                <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
                  <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: colors.primary }]} />
                </View>

                {section.items.map((movie) => {
                  const done = movie.status === 'watched';
                  const skipped = movie.status === 'skipped';
                  return (
                    <Pressable
                      key={movie.id}
                      style={({ pressed }) => [
                        styles.row,
                        { borderBottomColor: colors.border },
                        pressed && { backgroundColor: colors.accentSoft },
                      ]}
                      onPress={() =>
                        router.push({
                          pathname: '/watch-item/[itemId]',
                          params: { itemId: movie.movieId, year: String(section.year) },
                        })
                      }
                      // No button role here: the circle is a nested button.
                      accessible
                      accessibilityLabel={`Open ${movie.title}`}
                    >
                      <Pressable
                        hitSlop={10}
                        onPress={() => toggleWatched(section.year, movie)}
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: done }}
                        accessibilityLabel={done ? `Mark ${movie.title} as planned` : `Mark ${movie.title} as watched`}
                        style={[
                          styles.check,
                          done
                            ? { backgroundColor: STATUS_COLORS.watched, borderColor: STATUS_COLORS.watched }
                            : skipped
                              ? { borderColor: STATUS_COLORS.skipped }
                              : { borderColor: colors.textDim },
                        ]}
                      >
                        {done ? <Ionicons name="checkmark" size={13} color="#FFFFFF" /> : null}
                        {skipped ? <Ionicons name="close" size={14} color={STATUS_COLORS.skipped} /> : null}
                      </Pressable>
                      <Text
                        style={[
                          styles.movieTitle,
                          { color: done ? colors.textMuted : colors.text },
                          done && styles.movieTitleDone,
                        ]}
                        numberOfLines={2}
                      >
                        {movie.title}
                      </Text>
                      {done ? null : (
                        <Text style={[styles.statusLabel, { color: STATUS_COLORS[movie.status] }]}>
                          {STATUS_LABELS[movie.status]}
                        </Text>
                      )}
                    </Pressable>
                  );
                })}
              </View>
            );
          })
        )}
      </ScrollView>

      <Modal visible={addOpen} animationType="fade" transparent onRequestClose={closeAdd}>
        <View
          style={[
            styles.modalOverlay,
            styles.addOverlay,
            { backgroundColor: colors.overlay, paddingTop: insets.top + 24 },
          ]}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={closeAdd} accessibilityLabel="Close" />
          <View
            style={[
              styles.sheet,
              styles.addCard,
              { backgroundColor: colors.background, borderColor: colors.borderSoft, paddingBottom: SPACE.md },
            ]}
          >
            <View style={styles.sheetHeader}>
              <View style={styles.flex}>
                <Text style={[styles.sheetTitle, { color: colors.text }]}>Add to watchlist</Text>
              </View>
              <Pressable
                onPress={closeAdd}
                accessibilityRole="button"
                accessibilityLabel="Close"
                hitSlop={8}
                style={[styles.closeCircle, { backgroundColor: colors.surfaceAlt }]}
              >
                <Ionicons name="close" size={18} color={colors.textMuted} />
              </Pressable>
            </View>

            {/* Year stepper: minus and plus instead of typing four digits. */}
            <View style={styles.yearField}>
              <Text style={[styles.yearFieldLabel, { color: colors.textMuted }]}>Watchlist year</Text>
              <View
                style={[styles.stepper, { backgroundColor: colors.surfaceAlt }]}
                accessibilityLabel="Watchlist year"
                accessibilityValue={{ text: String(shownYear) }}
              >
                <Pressable
                  onPress={() => stepYear(-1)}
                  disabled={shownYear <= minYear}
                  accessibilityRole="button"
                  accessibilityLabel="Earlier year"
                  hitSlop={6}
                  style={({ pressed }) => [styles.stepButton, (pressed || shownYear <= minYear) && { opacity: 0.4 }]}
                >
                  <Ionicons name="remove" size={18} color={colors.accent} />
                </Pressable>
                <Text style={[styles.stepYear, { color: colors.text }]}>{shownYear}</Text>
                <Pressable
                  onPress={() => stepYear(1)}
                  disabled={shownYear >= maxYear}
                  accessibilityRole="button"
                  accessibilityLabel="Later year"
                  hitSlop={6}
                  style={({ pressed }) => [styles.stepButton, (pressed || shownYear >= maxYear) && { opacity: 0.4 }]}
                >
                  <Ionicons name="add" size={18} color={colors.accent} />
                </Pressable>
              </View>
            </View>

            <View style={[styles.searchRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
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
              {searching ? null : (
                <Text style={[styles.emptyResults, { color: colors.textMuted }]}>
                  {search.trim().length === 0
                    ? `Search to add a film to ${shownYear}.`
                    : 'Keep typing: suggestions appear after three letters.'}
                </Text>
              )}

              {searchResults.map((movie) => (
                <Pressable
                  key={movie.id}
                  disabled={busy}
                  onPress={() => addMovie(movie)}
                  accessibilityRole="button"
                  accessibilityLabel={`Add ${movie.title} to ${shownYear}`}
                  style={({ pressed }) => [
                    styles.resultRow,
                    { borderColor: colors.borderSoft },
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  <Poster uri={movie.posterPath} title={movie.title} width={38} radius={RADIUS.sm} />
                  <View style={styles.flex}>
                    <Text style={[styles.resultTitle, { color: colors.text }]} numberOfLines={1}>
                      {movie.title}
                    </Text>
                    <Text style={[styles.resultMeta, { color: colors.textDim }]}>
                      {movie.releaseDate ? yearOf(movie.releaseDate) : '—'}
                    </Text>
                  </View>
                  <View style={[styles.addPill, { backgroundColor: colors.accent }]}>
                    <Text style={[styles.addPillText, { color: colors.onAccent }]}>Add</Text>
                  </View>
                </Pressable>
              ))}

              {/* Only when the exact title is typed; a partial match that is already listed stays quiet. */}
              {searching && searchResults.length === 0 && typedExactlyOnList ? (
                <Text style={[styles.emptyResults, { color: colors.textMuted }]}>
                  Already on your watchlist. Move or remove it there to add it again.
                </Text>
              ) : null}

              {searching && searchHits.length === 0 ? (
                <Text style={[styles.emptyResults, { color: colors.textMuted }]}>
                  No film called “{search.trim()}” in your database. Add it from the Film database first.
                </Text>
              ) : null}
            </ScrollView>
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
    minHeight: 42,
    paddingHorizontal: 12,
    marginLeft: 8,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    marginBottom: 6,
  },
  listSearch: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.sm,
    paddingHorizontal: SPACE.md,
    height: 42,
    borderRadius: RADIUS.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  listSearchInput: {
    ...TYPE.body,
    flex: 1,
    padding: 0,
  },
  yearBlock: {
    paddingHorizontal: 16,
    marginTop: 18,
  },
  yearHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
  },
  yearTitle: {
    fontFamily: NUMBER_FONT,
    fontSize: 24,
    lineHeight: 32,
    fontWeight: '400',
    letterSpacing: 0,
    fontVariant: ['tabular-nums'],
  },
  yearCount: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  progressTrack: {
    height: 5,
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: 4,
    marginBottom: 4,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 2,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  check: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  movieTitle: {
    flex: 1,
    minWidth: 0,
    fontSize: 15,
    lineHeight: 19,
    fontWeight: '700',
    letterSpacing: -0.1,
  },
  movieTitleDone: {
    textDecorationLine: 'line-through',
  },
  statusLabel: {
    fontSize: 11.5,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  loading: {
    paddingTop: SPACE.xl,
    alignItems: 'center',
  },
  emptyWrap: {
    paddingHorizontal: 12,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  // The add-film search is a card at the top of the screen, so the keyboard never pushes it.
  addOverlay: {
    justifyContent: 'flex-start',
    paddingHorizontal: 12,
  },
  addCard: {
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    maxHeight: '75%',
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    borderBottomLeftRadius: RADIUS.xl,
    borderBottomRightRadius: RADIUS.xl,
    paddingTop: SPACE.md,
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
    fontSize: 17,
    fontWeight: '800',
  },
  sheetSubtitle: {
    ...TYPE.caption,
    marginTop: 2,
  },
  yearField: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACE.sm,
  },
  yearFieldLabel: {
    ...TYPE.small,
    fontWeight: '700',
  },
  closeCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 38,
    borderRadius: RADIUS.pill,
    overflow: 'hidden',
  },
  stepButton: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepYear: {
    minWidth: 58,
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  addPill: {
    borderRadius: RADIUS.pill,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  addPillText: {
    fontSize: 12.5,
    fontWeight: '800',
  },
  manualIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.sm,
    paddingHorizontal: SPACE.md,
    minHeight: 46,
    borderRadius: RADIUS.pill,
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
    paddingVertical: 12,
    paddingHorizontal: SPACE.md,
    borderRadius: RADIUS.lg,
    borderWidth: 1.5,
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
});
