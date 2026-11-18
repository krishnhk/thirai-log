import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  BackHandler,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { INPUT_RESET, SPACE, RADIUS, TYPE, useTheme } from '../theme';
import { useLibrary } from '../hooks/useLibrary';
import { useMovieSearch } from '../hooks/useMovieSearch';
import { markWatchlistWatched, searchableFilms } from '../lib/library';
import {
  resolvePoster,
  saveViewingEntry,
  updateFilmPoster,
  type Companion,
  type ViewingEntry,
} from '../lib/library';
import type { Movie } from '../api/movies';
import {
  formatInputDate,
  parseInputDate,
  todayInputValue,
  toInputDate,
  yearOf,
  type DateStyle,
} from '../lib/format';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppHeader } from '../components/AppHeader';
import { TheatrePicker } from '../components/TheatrePicker';
import { CompanionPicker } from '../components/CompanionPicker';
import { DatePickerSheet } from '../components/DatePickerSheet';
import { Card } from '../components/Card';
import { Poster } from '../components/Poster';
import { ActionButton } from '../components/ActionButton';

interface SelectedMovie {
  movieId: string;
  title: string;
  posterPath?: string;
  releaseDate?: string;
}

type Banner = { type: 'success' | 'error'; text: string } | null;

export default function LogScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { editEntryId, from } = useLocalSearchParams<{ editEntryId?: string; from?: string }>();
  const { library, loading, refresh } = useLibrary();

  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<SelectedMovie | null>(null);
  const [dateText, setDateText] = useState(todayInputValue());
  const [theatre, setTheatre] = useState('');
  const [theatreId, setTheatreId] = useState<string | undefined>(undefined);
  const [companion, setCompanion] = useState<Companion | undefined>(undefined);
  const [companionError, setCompanionError] = useState(false);
  // True when an entry saved before the question existed is being edited.
  const [unansweredOld, setUnansweredOld] = useState(false);
  const scrollRef = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [banner, setBanner] = useState<Banner>(null);
  const [searchFocused, setSearchFocused] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  // Fixed date style, for example 17 Nov 2026.
  const dateStyle: DateStyle = 'medium';

  const searchable = useMemo(() => searchableFilms(library), [library]);
  const { results } = useMovieSearch(query, searchable);

  // Opening the tab fresh starts with an empty search and no film selected.
  // An edit that arrives through the route (editEntryId) is left alone.
  useFocusEffect(
    useCallback(() => {
      if (!editEntryId) {
        setSelected(null);
        setQuery('');
        setEditingId(null);
        // A fresh Log opens with an empty form, today's date and no answer chosen yet.
        setTheatre('');
        setTheatreId(undefined);
        setCompanion(undefined);
        setCompanionError(false);
        setDateText(todayInputValue());
      }
    }, [editEntryId])
  );

  function fillFromEntry(entry: ViewingEntry) {
    setEditingId(entry.id);
    setSelected({
      movieId: entry.movieId,
      title: entry.title,
      posterPath: resolvePoster(library, entry.movieId, entry.title),
    });
    setQuery(entry.title);
    setDateText(toInputDate(entry.watchedAt));
    setTheatre(entry.theatre ?? '');
    setTheatreId(entry.theatreId);
    setCompanion(entry.companion);
    setCompanionError(false);
    setUnansweredOld(!entry.companion);
    setBanner(null);
  }

  // Pre-fill the form when arriving from Diary or Statistics. Only once per entry,
  // so a background library refresh cannot overwrite what the user is typing.
  useEffect(() => {
    if (!editEntryId || editingId === editEntryId) return;
    const entry = library.entries.find((item) => item.id === editEntryId);
    if (!entry) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fillFromEntry(entry);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editEntryId, library, editingId]);

  const resetForm = () => {
    setSelected(null);
    setQuery('');
    setDateText(todayInputValue());
    setTheatre('');
    setTheatreId(undefined);
    setCompanion(undefined);
    setCompanionError(false);
    setUnansweredOld(false);
    setEditingId(null);
    router.setParams({ editEntryId: undefined, from: undefined });
  };

  // Editing: discard changes (the saved entry is untouched) and go back to where the edit started.
  const handleCancel = useCallback(() => {
    resetForm();
    if (from === 'diary') router.navigate('/diary');
  }, [from]);

  // Android back button while editing from the Diary returns to the Diary.
  useFocusEffect(
    useCallback(() => {
      if (!editEntryId || from !== 'diary') return undefined;
      const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
        handleCancel();
        return true;
      });
      return () => subscription.remove();
    }, [editEntryId, from, handleCancel])
  );

  // Deletes only this viewing record. The film itself, other viewings of it and the watchlist stay.
  const handleSelect = (movie: Movie) => {
    setSelected({
      movieId: movie.id,
      title: movie.title,
      posterPath: movie.posterPath,
      releaseDate: movie.releaseDate,
    });
    setQuery(movie.title);
    setBanner(null);
  };

  // Films not in the database are added on their own screen, then found by search.
  const addManually = () => {
    const title = query.trim();
    if (!title) return;
    setQuery('');
    router.navigate({ pathname: '/add-movie', params: { title } });
  };

  const handleSave = async () => {
    const title = selected?.title?.trim() ?? '';
    if (!title) {
      setBanner({ type: 'error', text: 'Choose a film or type a title to log.' });
      return;
    }
    const parsedDate = parseInputDate(dateText);
    if (!parsedDate) {
      setBanner({ type: 'error', text: 'Enter a valid date (YYYY-MM-DD).' });
      return;
    }

    if (!companion) {
      setCompanionError(true);
      setBanner({ type: 'error', text: 'Choose who you watched with.' });
      return;
    }

    try {
      setSaving(true);
      const existing = editingId
        ? library.entries.find((item) => item.id === editingId)
        : undefined;
      const movieId = selected?.movieId ?? `manual-${title.toLowerCase()}`;

      const entry: ViewingEntry = {
        id: existing?.id ?? `${movieId}-${Date.now()}`,
        movieId,
        title,
        watchedAt: parsedDate.toISOString(),
        theatre: theatre.trim() || undefined,
        // Cleared together with the name; saveViewingEntry replaces both fields.
        theatreId: theatre.trim() ? theatreId : undefined,
        companion,
        status: 'watched',
        createdAt: existing?.createdAt ?? new Date().toISOString(),
      };

      await saveViewingEntry(entry);
      await markWatchlistWatched(movieId, title);
      // A poster chosen for a film is stored with the film, so every list shows it.
      if (selected?.posterPath) {
        await updateFilmPoster(movieId, title, selected.posterPath);
      }

      const wasEditing = Boolean(editingId);
      const returnToDiary = from === 'diary';
      resetForm();
      await refresh();
      if (returnToDiary) {
        router.navigate('/diary');
        return;
      }
      if (!wasEditing) {
        router.push({ pathname: '/viewing/[entryId]', params: { entryId: entry.id, justLogged: '1' } });
        return;
      }
      setBanner({
        type: 'success',
        text: wasEditing ? 'Viewing updated.' : 'Viewing saved to your diary.',
      });
    } catch {
      setBanner({ type: 'error', text: 'Could not save this viewing. Try again.' });
    } finally {
      setSaving(false);
    }
  };

  // Editing a viewing with nothing changed: Update stays disabled.
  const editedEntry = editingId ? library.entries.find((item) => item.id === editingId) : undefined;
  const unchanged =
    editedEntry !== undefined &&
    selected !== null &&
    selected.movieId === editedEntry.movieId &&
    selected.title.trim() === editedEntry.title.trim() &&
    dateText === toInputDate(editedEntry.watchedAt) &&
    theatre.trim() === (editedEntry.theatre ?? '').trim() &&
    theatreId === editedEntry.theatreId &&
    companion === editedEntry.companion &&
    selected.posterPath === resolvePoster(library, editedEntry.movieId, editedEntry.title);

  const isPicked = selected !== null && query === selected.title;
  const showResults = query.trim().length > 0 && !isPicked;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {editEntryId ? (
        <View
          style={[
            styles.editHeader,
            { paddingTop: insets.top + 12, backgroundColor: colors.background },
          ]}
        >
          <View style={styles.editHeaderText}>
            <Text style={[styles.title, { color: colors.text }]}>Edit viewing</Text>
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>
              Changes are saved only when you update.
            </Text>
          </View>
        </View>
      ) : (
        <AppHeader title="Log a film" subtitle="Capture the film, the theatre, and how it felt." />
      )}

      <ScrollView
        ref={scrollRef}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: SPACE.lg,
          width: '100%',
          maxWidth: 720,
          alignSelf: 'center',
        }}
      >
        {banner ? (
          <View
            style={[
              styles.banner,
              {
                backgroundColor: banner.type === 'success' ? `${colors.teal}1F` : `${colors.rose}1F`,
                borderColor: banner.type === 'success' ? `${colors.teal}55` : `${colors.rose}55`,
              },
            ]}
          >
            <Ionicons
              name={banner.type === 'success' ? 'checkmark-circle' : 'alert-circle'}
              size={18}
              color={banner.type === 'success' ? colors.teal : colors.rose}
            />
            <Text
              style={[
                styles.bannerText,
                { color: banner.type === 'success' ? colors.teal : colors.rose },
              ]}
            >
              {banner.text}
            </Text>
          </View>
        ) : null}

        {editingId && selected ? (
          <Card style={styles.section}>
            <StepLabel step="1" title="The Film" />
            <View style={styles.lockedFilm}>
              <Poster uri={selected.posterPath} title={selected.title} width={104} radius={RADIUS.md} />
              <View style={styles.resultText}>
                <Text style={[styles.lockedTitle, { color: colors.text }]} numberOfLines={4}>
                  {selected.title}
                </Text>
              </View>
            </View>
          </Card>
        ) : (
        <Card style={styles.section}>
          <StepLabel step="1" title="The Film" />
          <View
            style={[
              styles.searchRow,
              {
                backgroundColor: colors.background,
                borderColor: searchFocused ? colors.accent : `${colors.accent}66`,
              },
            ]}
          >
            <Ionicons name="search" size={18} color={colors.accent} />
            <TextInput
              value={query}
              onChangeText={(text) => {
                setQuery(text);
                if (selected && text !== selected.title) setSelected(null);
                setBanner(null);
              }}
              placeholder="Search films by title…"
              placeholderTextColor={colors.textMuted}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              style={[styles.searchInput, { color: colors.text }]}
              returnKeyType="search"
              autoCorrect={false}
            />
            {query.length > 0 ? (
              <Pressable
                onPress={() => {
                  setQuery('');
                  setSelected(null);
                }}
                accessibilityLabel="Clear search"
                hitSlop={8}
              >
                <Ionicons name="close-circle" size={18} color={colors.textMuted} />
              </Pressable>
            ) : null}
          </View>

          {showResults ? (
            <View style={styles.results}>
              {results.map((movie) => (
                <Pressable
                  key={movie.id}
                  onPress={() => handleSelect(movie)}
                  style={({ pressed }) => [
                    styles.resultRow,
                    { borderColor: colors.borderSoft },
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  <Poster uri={movie.posterPath} title={movie.title} width={34} radius={RADIUS.sm} />
                  <View style={styles.resultText}>
                    <Text style={[styles.resultTitle, { color: colors.text }]} numberOfLines={1}>
                      {movie.title}
                    </Text>
                    {movie.releaseDate ? (
                      <Text style={[styles.resultMeta, { color: colors.textMuted }]}>
                        {yearOf(movie.releaseDate)}
                      </Text>
                    ) : null}
                  </View>
                  <Ionicons name="add-circle" size={22} color={colors.accent} />
                </Pressable>
              ))}

              {results.length === 0 ? (
                <Pressable
                  onPress={addManually}
                  style={({ pressed }) => [styles.manualRow, { borderColor: colors.border }, pressed && { opacity: 0.7 }]}
                >
                  <Ionicons name="add-circle-outline" size={17} color={colors.accent} />
                  <Text style={[styles.manualText, { color: colors.text }]} numberOfLines={1}>
                    Add “{query.trim()}” manually
                  </Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}

          {!showResults && !selected ? (
            <Text style={[styles.hint, { color: colors.textMuted }]}>
              Search films you have logged before, or type a title to add it manually.
            </Text>
          ) : null}
        </Card>
        )}

        <Card style={styles.section}>
          <StepLabel step="2" title="The Viewing" />

          <Field label="Watched on">
            <View style={styles.dateRow}>
              <Pressable
                onPress={() => setCalendarOpen(true)}
                accessibilityRole="button"
                accessibilityLabel={`Watched on ${formatInputDate(dateText, dateStyle)}. Open calendar`}
                style={({ pressed }) => [
                  styles.inputRow,
                  styles.flex,
                  { backgroundColor: colors.background, borderColor: colors.border },
                  pressed && { opacity: 0.8 },
                ]}
              >
                <Ionicons name="calendar-outline" size={17} color={colors.coralInk} />
                <Text style={[styles.input, styles.dateText, { color: colors.text }]} numberOfLines={1}>
                  {formatInputDate(dateText, dateStyle)}
                </Text>
                <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
              </Pressable>
              <Pressable
                onPress={() => setDateText(todayInputValue())}
                style={[styles.todayBtn, { borderColor: `${colors.accent}66`, backgroundColor: colors.accentSoft }]}
                accessibilityRole="button"
              >
                <Text style={[styles.todayText, { color: colors.coralInk }]}>Today</Text>
              </Pressable>
            </View>
          </Field>

          <Field label="Theatre" optional>
            <TheatrePicker
              value={theatre}
              theatreId={theatreId}
              theatres={library.theatres}
              onChange={(next) => {
                setTheatre(next.theatre);
                setTheatreId(next.theatreId);
              }}
              onOpen={() => scrollRef.current?.scrollToEnd({ animated: true })}
            />
          </Field>

          <View style={styles.field}>
            <CompanionPicker
              value={companion}
              onChange={(value) => {
                setCompanion(value);
                setCompanionError(false);
                setBanner(null);
              }}
              error={companionError && !companion ? 'Choose who you watched with.' : null}
              hint={
                unansweredOld && !companion
                  ? 'This viewing was saved before this question existed, so nothing is selected yet.'
                  : null
              }
            />
          </View>

        </Card>

        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.accent} />
          </View>
        ) : null}
      </ScrollView>

      <DatePickerSheet
        visible={calendarOpen}
        value={dateText}
        onSelect={setDateText}
        onClose={() => setCalendarOpen(false)}
      />

      <View
        style={[
          styles.footer,
          {
            backgroundColor: colors.background,
            borderTopColor: colors.borderSoft,
            // With the tab bar showing, keep Save clear of the raised Log button; while editing
            // the bar is hidden, so only the safe area is needed.
            paddingBottom: editEntryId ? insets.bottom + 14 : 34,
          },
        ]}
      >
        {editingId ? (
          <ActionButton label="Cancel" variant="outline" onPress={handleCancel} style={styles.footerCancel} />
        ) : null}
        <ActionButton
          label={editingId ? 'Update viewing' : 'Save to diary'}
          icon="checkmark"
          onPress={handleSave}
          loading={saving}
          disabled={unchanged}
          style={styles.footerSave}
        />
      </View>
    </View>
  );
}

function StepLabel({ step, title }: { step: string; title: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.stepRow}>
      <View style={[styles.stepBadge, { backgroundColor: colors.primary }]}>
        <Text style={[styles.stepNumber, { color: colors.primaryText }]}>{step}</Text>
      </View>
      <Text style={[styles.stepTitle, { color: colors.text }]}>{title}</Text>
    </View>
  );
}

function Field({
  label,
  optional,
  children,
}: {
  label: string;
  optional?: boolean;
  children: React.ReactNode;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { color: colors.text }]}>
        {label}
        {optional ? <Text style={{ color: colors.textMuted, fontWeight: '500' }}>  (optional)</Text> : null}
      </Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  editHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  editHeaderText: {
    flex: 1,
  },
  back: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1A2A42',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  lockedFilm: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.lg,
    paddingTop: SPACE.xs,
  },
  lockedTitle: {
    ...TYPE.title,
    fontSize: 22,
    lineHeight: 27,
  },
  title: {
    ...TYPE.title,
    fontSize: 24,
    lineHeight: 29,
  },
  subtitle: {
    ...TYPE.small,
    marginTop: 2,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.sm,
    marginHorizontal: 12,
    marginBottom: 10,
    paddingHorizontal: SPACE.md,
    paddingVertical: 10,
    borderRadius: RADIUS.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  bannerText: {
    ...TYPE.small,
    fontWeight: '700',
    flex: 1,
  },
  section: {
    marginHorizontal: 12,
    marginBottom: 10,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.sm,
    marginBottom: 10,
  },
  stepBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumber: {
    fontSize: 12,
    fontWeight: '800',
  },
  stepTitle: {
    ...TYPE.heading,
    fontSize: 15,
    fontWeight: '800',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.sm,
    paddingHorizontal: SPACE.md,
    minHeight: 50,
    borderRadius: RADIUS.lg,
    borderWidth: 1.5,
  },
  searchInput: {
    ...TYPE.body,
    ...INPUT_RESET,
    flex: 1,
    padding: 0,
  },
  results: {
    marginTop: SPACE.sm,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.md,
    paddingVertical: SPACE.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  resultText: {
    flex: 1,
  },
  resultTitle: {
    ...TYPE.small,
    fontWeight: '700',
  },
  resultMeta: {
    ...TYPE.caption,
    marginTop: 2,
  },
  spinner: {
    marginTop: SPACE.sm,
    alignSelf: 'flex-start',
  },
  searchingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.sm,
    marginTop: SPACE.sm,
  },
  hint: {
    ...TYPE.caption,
    lineHeight: 17,
    marginTop: SPACE.sm,
  },
  manualRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.sm,
    marginTop: SPACE.sm,
    paddingVertical: 12,
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
  selectedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.md,
    marginTop: SPACE.md,
    padding: SPACE.md,
    borderRadius: RADIUS.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  selectedText: {
    flex: 1,
  },
  selectedTitle: {
    ...TYPE.body,
    fontWeight: '800',
  },
  selectedMeta: {
    ...TYPE.caption,
    marginTop: 2,
  },
  posterHint: {
    ...TYPE.caption,
    fontWeight: '700',
    marginTop: 6,
  },
  field: {
    marginBottom: SPACE.md,
  },
  fieldLabel: {
    ...TYPE.caption,
    fontWeight: '800',
    marginBottom: 6,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.sm,
  },
  flex: {
    flex: 1,
  },
  dateText: {
    padding: 0,
    fontWeight: '600',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.sm,
    paddingHorizontal: SPACE.md,
    height: 46,
    borderRadius: RADIUS.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  input: {
    ...TYPE.body,
    ...INPUT_RESET,
    flex: 1,
    padding: 0,
  },
  todayBtn: {
    height: 46,
    paddingHorizontal: SPACE.lg,
    borderRadius: RADIUS.lg,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayText: {
    ...TYPE.small,
    fontWeight: '800',
  },
  loading: {
    paddingTop: SPACE.xl,
    alignItems: 'center',
  },
  footer: {
    flexDirection: 'row',
    gap: SPACE.sm,
    paddingHorizontal: 12,
    paddingTop: SPACE.sm + 2,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  footerCancel: {
    flex: 0.4,
  },
  footerSave: {
    flex: 1,
  },
});
