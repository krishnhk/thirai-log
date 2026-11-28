import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { INPUT_RESET, SPACE, RADIUS, NUMBER_FONT, TYPE, useTheme } from '../theme';
import { useLibrary } from '../hooks/useLibrary';
import { useMovieSearch } from '../hooks/useMovieSearch';
import { filmYear, searchableFilms } from '../lib/library';
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
import { ProgressRing } from '../components/ProgressRing';
import { Poster } from '../components/Poster';
import { YearStrip } from '../components/YearStrip';
import { AddPill } from '../components/AddPill';
import { ActionButton } from '../components/ActionButton';

export default function WatchlistScreen() {
  const { colors } = useTheme();
  // Colours of the status label shown beside films that are not watched yet (from the current theme).
  const statusColors: Record<EntryStatus, string> = {
    planned: colors.statusPlanned,
    watched: colors.statusWatched,
    skipped: colors.statusSkipped,
  };
  const insets = useSafeAreaInsets();
  const { library, loading, refresh } = useLibrary();

  const currentYear = new Date().getFullYear();
  const [addOpen, setAddOpen] = useState(false);
  const [search, setSearch] = useState('');
  // The year the film is added to. Starts as the current year; the user can type any other year.
  const [addYear, setAddYear] = useState(String(new Date().getFullYear()));
  // True when the sheet was opened from a year that is already open: the year is then known, so it is not asked.
  const [yearFixed, setYearFixed] = useState(false);
  const [busy, setBusy] = useState(false);

  // The years that have a list, oldest first, shown as chips. One year is open at a time.
  const years = useMemo(
    () => library.annual.filter((list) => list.movies.length > 0).map((list) => list.year).sort((a, b) => a - b),
    [library.annual]
  );
  const [pickedYear, setPickedYear] = useState<number | null>(null);
  // The arrows step through every year from the oldest list (or this year) to ten years ahead.
  const firstYear = Math.min(years[0] ?? currentYear, currentYear);
  const lastYear = currentYear + 10;
  // The year you stepped to; until then this year when it has a list, otherwise the newest one.
  const defaultYear = years.includes(currentYear) ? currentYear : (years[years.length - 1] ?? currentYear);
  const openYear = pickedYear !== null && pickedYear >= firstYear && pickedYear <= lastYear ? pickedYear : defaultYear;
  const openList = useMemo(() => {
    const list = library.annual.find((item) => item.year === openYear);
    const items = [...(list?.movies ?? [])].sort((a, b) =>
      a.title.localeCompare(b.title, undefined, { sensitivity: 'base', numeric: true })
    );
    return {
      items,
      total: items.length,
      watched: items.filter((movie) => movie.status === 'watched').length,
    };
  }, [library.annual, openYear]);
  const openPct = openList.total > 0 ? openList.watched / openList.total : 0;

  // The ring fills from empty to the watched share each time the page is opened, a year is picked, or the
  // films finish loading.
  const [ringValue] = useState(() => new Animated.Value(0));
  const [ringProgress, setRingProgress] = useState(0);
  const [openedAt, setOpenedAt] = useState(0);
  useFocusEffect(
    useCallback(() => {
      setOpenedAt((tick) => tick + 1);
    }, [])
  );
  useEffect(() => {
    const id = ringValue.addListener(({ value }) => setRingProgress(value));
    return () => ringValue.removeListener(id);
  }, [ringValue]);
  useEffect(() => {
    ringValue.stopAnimation();
    ringValue.setValue(0);
    const animation = Animated.timing(ringValue, {
      toValue: openPct,
      duration: 900,
      delay: 120,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    });
    animation.start();
    return () => animation.stop();
  }, [openPct, openYear, openedAt, ringValue]);

  // With no films in any year the screen is just a big call to action.
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
  const releaseYears = useMemo(() => new Map(searchable.map((film) => [film.id, filmYear(film)])), [searchable]);
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
    setYearFixed(false);
    setSearch('');
    setAddYear(String(currentYear));
  };

  const addMovie = async (movie: Movie) => {
    if (busy) return;
    const targetYear = Number(addYear);
    if (!/^\d{4}$/.test(addYear.trim()) || targetYear < 1900 || targetYear > currentYear + 10) {
      notify('Check the year', `Enter a year between 1900 and ${currentYear + 10} for the bucket list.`);
      return;
    }
    // A film cannot be on a watchlist for a year before it was released.
    const releaseYear = movie.releaseDate ? Number(yearOf(movie.releaseDate)) : NaN;
    if (Number.isFinite(releaseYear) && releaseYear > targetYear) {
      notify(
        'Not released yet',
        `“${movie.title}” is a ${releaseYear} film, so it cannot be added to your ${targetYear} bucket list.`
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
      <AppHeader title="Bucket list" subtitle="Films you plan to watch, by year." />

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : noWatchlist ? (
        <View style={styles.bigEmpty}>
          <View style={styles.markBox}>
            <Image
              source={require('../../assets/logo/mark-lid.png')}
              style={[styles.markLayer, { tintColor: colors.accent, opacity: 0.35 }]}
              resizeMode="contain"
            />
            <Image
              source={require('../../assets/logo/mark-iris.png')}
              style={[styles.markLayer, { tintColor: colors.accent }]}
              resizeMode="contain"
            />
          </View>
          <Text style={[styles.bigEmptyTitle, { color: colors.text }]}>Nothing on your {currentYear} list yet</Text>
          <Text style={[styles.bigEmptyText, { color: colors.textMuted }]}>
            Add the films you want to watch this year and tick them off as you go.
          </Text>
          <ActionButton
            label="Add your first film"
            icon="add"
            onPress={() => {
              setYearFixed(false);
              setAddOpen(true);
            }}
          />
        </View>
      ) : (
        <>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 96, width: '100%', maxWidth: 720, alignSelf: 'center' }}
          >
            {/* One line, no card: the year with its arrows on the left, the count and a small ring on the right. The
                ring fills from empty to the watched share, and a year with no films shows an empty list you can start. */}
            <YearStrip
              label="WATCHED"
              lead={
                <ProgressRing
                  size={28}
                  stroke={4}
                  progress={ringProgress}
                  color={colors.primary}
                  trackColor={colors.coralSoft}
                />
              }
              value={
                <>
                  {openList.watched}
                  <Text style={{ color: colors.textMuted }}>/{openList.total}</Text>
                </>
              }
              accessibilityLabel={`${openList.watched} of ${openList.total} watched`}
              year={openYear}
              canPrev={openYear > firstYear}
              canNext={openYear < lastYear}
              onPrev={() => setPickedYear(openYear - 1)}
              onNext={() => setPickedYear(openYear + 1)}
            />

            {/* The films of the open year. */}
            {openList.total === 0 ? (
              <View style={[styles.listCard, styles.yearEmpty, { backgroundColor: colors.surface, borderColor: colors.borderSoft }]}>
                <Text style={[styles.heroTitle, { color: colors.text }]}>Nothing on your {openYear} list yet</Text>
                <Text style={[styles.heroSub, { color: colors.textMuted }]}>Tap Add film to start it.</Text>
              </View>
            ) : (
              <View style={styles.checklist}>
                {[
                  {
                    key: 'next',
                    label: 'UP NEXT',
                    items: openList.items.filter((m) => m.status !== 'watched' && m.status !== 'skipped'),
                  },
                  { key: 'done', label: 'DONE', items: openList.items.filter((m) => m.status === 'watched') },
                  { key: 'skipped', label: 'SKIPPED', items: openList.items.filter((m) => m.status === 'skipped') },
                ].map((section) =>
                  section.items.length === 0 ? null : (
                    <View key={section.key}>
                      <Text
                        style={[
                          styles.sectionLabel,
                          { color: section.key === 'next' ? colors.accent : colors.textMuted },
                        ]}
                      >
                        {section.label}
                      </Text>
                      {section.items.map((movie) => {
                        const done = movie.status === 'watched';
                        const skipped = movie.status === 'skipped';
                        const released = releaseYears.get(movie.movieId);
                        return (
                          <View key={movie.id} style={[styles.checkRow, { borderBottomColor: colors.border }]}>
                            <Pressable
                              hitSlop={10}
                              onPress={() => toggleWatched(openYear, movie)}
                              accessibilityRole="checkbox"
                              accessibilityState={{ checked: done }}
                              accessibilityLabel={
                                done ? `Mark ${movie.title} as planned` : `Mark ${movie.title} as watched`
                              }
                              style={[
                                styles.box,
                                done
                                  ? { backgroundColor: statusColors.watched, borderColor: statusColors.watched }
                                  : skipped
                                    ? { borderColor: statusColors.skipped }
                                    : { borderColor: colors.textDim },
                              ]}
                            >
                              {done ? <Ionicons name="checkmark" size={15} color={colors.onAccent} /> : null}
                              {skipped ? <Ionicons name="close" size={16} color={statusColors.skipped} /> : null}
                            </Pressable>
                            <Pressable
                              style={({ pressed }) => [styles.checkBody, pressed && { opacity: 0.6 }]}
                              onPress={() =>
                                router.push({
                                  pathname: '/watch-item/[itemId]',
                                  params: { itemId: movie.movieId, year: String(openYear) },
                                })
                              }
                              accessibilityRole="button"
                              accessibilityLabel={`Open ${movie.title}`}
                            >
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
                              {released && String(released) !== String(openYear) ? (
                                <Text style={[styles.filmMeta, { color: colors.textMuted }]}>Released {released}</Text>
                              ) : null}
                            </Pressable>
                            <Ionicons name="chevron-forward" size={16} color={colors.textDim} />
                          </View>
                        );
                      })}
                    </View>
                  )
                )}
              </View>
            )}
          </ScrollView>

          {/* Add film floats at the bottom right. It is added to the year that is open, so the sheet does not ask for a year. */}
          <AddPill
            label="Add film"
            onPress={() => {
              setAddYear(String(openYear));
              setYearFixed(true);
              setAddOpen(true);
            }}
          />
        </>
      )}

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
                <Text style={[styles.sheetTitle, { color: colors.text }]}>
                  {yearFixed ? `Add to ${shownYear} bucket list` : 'Add to bucket list'}
                </Text>
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

            {/* Year stepper (minus and plus), only when the year still has to be chosen: from "+ Year" or the first film. */}
            {yearFixed ? null : (
              <View style={styles.yearField}>
                <Text style={[styles.yearFieldLabel, { color: colors.textMuted }]}>Bucket list year</Text>
                <View
                  style={[styles.stepper, { backgroundColor: colors.surfaceAlt }]}
                  accessibilityLabel="Bucket list year"
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
            )}

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
                  Already on your bucket list. Move or remove it there to add it again.
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
  bigEmpty: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingTop: 56,
    gap: 6,
  },
  markBox: {
    width: 150,
    height: 120,
    marginBottom: 14,
  },
  markLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
  },
  bigEmptyTitle: {
    ...TYPE.heading,
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  bigEmptyText: {
    ...TYPE.small,
    textAlign: 'center',
    maxWidth: 260,
    marginBottom: 14,
  },
  heroTitle: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '800',
  },
  heroSub: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
    marginTop: 2,
  },
  headerLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 12,
  },
  yearGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  countGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  countText: {
    fontSize: 14,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  yearArrow: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  yearNavText: {
    minWidth: 48,
    textAlign: 'center',
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  listCard: {
    marginHorizontal: 12,
    borderRadius: RADIUS.xl,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  checklist: {
    paddingHorizontal: 16,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.4,
    marginTop: 14,
    marginBottom: 4,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  box: {
    width: 24,
    height: 24,
    borderRadius: 7,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkBody: {
    flex: 1,
    minWidth: 0,
  },
  yearEmpty: {
    padding: 18,
    alignItems: 'center',
  },
  filmRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  filmMeta: {
    fontSize: 11.5,
    fontWeight: '600',
    marginTop: 2,
  },
  floatAdd: {
    position: 'absolute',
    right: 20,
    bottom: 16,
  },
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
