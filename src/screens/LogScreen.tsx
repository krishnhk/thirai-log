import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { INPUT_RESET, SPACE, RADIUS, TYPE, useTheme } from '../theme';
import { useLibrary } from '../hooks/useLibrary';
import { useMovieSearch } from '../hooks/useMovieSearch';
import { markWatchlistWatched, searchableFilms } from '../lib/library';
import {
  deleteViewingEntry,
  resolvePoster,
  saveViewingEntry,
  updateFilmPoster,
  type ViewingEntry,
} from '../lib/library';
import type { Movie } from '../api/movies';
import { formatDate, parseInputDate, todayInputValue, toDate, yearOf } from '../lib/format';
import { confirmAction } from '../lib/ui';
import { ScreenHeader } from '../components/ScreenHeader';
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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [banner, setBanner] = useState<Banner>(null);

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
      }
    }, [editEntryId])
  );

  // Pre-fill the form when arriving from Diary or Statistics. Only once per entry,
  // so a background library refresh cannot overwrite what the user is typing.
  useEffect(() => {
    if (!editEntryId || editingId === editEntryId) return;
    const entry = library.entries.find((item) => item.id === editEntryId);
    if (!entry) return;
    fillFromEntry(entry);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editEntryId, library, editingId]);

  const recentEntries = useMemo(
    () =>
      [...library.entries]
        .sort((a, b) => toDate(b.watchedAt).getTime() - toDate(a.watchedAt).getTime())
        .slice(0, 6),
    [library.entries]
  );

  function fillFromEntry(entry: ViewingEntry) {
    setEditingId(entry.id);
    setSelected({
      movieId: entry.movieId,
      title: entry.title,
      posterPath: resolvePoster(library, entry.movieId, entry.title),
    });
    setQuery(entry.title);
    setDateText(toDate(entry.watchedAt).toISOString().slice(0, 10));
    setTheatre(entry.theatre ?? '');
    setBanner(null);
  }

  const resetForm = () => {
    setSelected(null);
    setQuery('');
    setDateText(todayInputValue());
    setTheatre('');
    setEditingId(null);
    router.setParams({ editEntryId: undefined, from: undefined });
  };

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

  const handleDelete = (entry: ViewingEntry) => {
    confirmAction('Delete entry', `Remove “${entry.title}” from your diary?`, async () => {
      await deleteViewingEntry(entry.id);
      await refresh();
      if (editingId === entry.id) resetForm();
      setBanner({ type: 'success', text: 'Viewing removed.' });
    });
  };

  const isPicked = selected !== null && query === selected.title;
  const showResults = query.trim().length > 0 && !isPicked;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: SPACE.xxl,
          width: '100%',
          maxWidth: 720,
          alignSelf: 'center',
        }}
      >
        <ScreenHeader
          eyebrow={editingId ? 'Editing' : 'New viewing'}
          title={editingId ? 'Edit viewing' : 'Log a film'}
          subtitle="Capture the film, the theatre, and how it felt."
        />

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

        <Card style={styles.section}>
          <StepLabel step="1" title="The film" />
          <View style={[styles.searchRow, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
            <Ionicons name="search" size={17} color={colors.textDim} />
            <TextInput
              value={query}
              onChangeText={(text) => {
                setQuery(text);
                if (selected && text !== selected.title) setSelected(null);
                setBanner(null);
              }}
              placeholder="Search films by title…"
              placeholderTextColor={colors.textDim}
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
                <Ionicons name="close-circle" size={18} color={colors.textDim} />
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
                  <Poster uri={movie.posterPath} title={movie.title} width={38} radius={RADIUS.sm} />
                  <View style={styles.resultText}>
                    <Text style={[styles.resultTitle, { color: colors.text }]} numberOfLines={1}>
                      {movie.title}
                    </Text>
                    {movie.releaseDate ? (
                      <Text style={[styles.resultMeta, { color: colors.textDim }]}>
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
            <Text style={[styles.hint, { color: colors.textDim }]}>
              Search films you have logged before, or type a title to add it manually.
            </Text>
          ) : null}
        </Card>

        <Card style={styles.section}>
          <StepLabel step="2" title="The viewing" />

          <Field label="Watched on">
            <View style={styles.dateRow}>
              <View style={[styles.inputRow, styles.flex, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
                <Ionicons name="calendar-outline" size={17} color={colors.textDim} />
                <TextInput
                  value={dateText}
                  onChangeText={setDateText}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.textDim}
                  style={[styles.input, { color: colors.text }]}
                  autoCapitalize="none"
                />
              </View>
              <Pressable
                onPress={() => setDateText(todayInputValue())}
                style={[styles.todayBtn, { borderColor: colors.border }]}
                accessibilityRole="button"
              >
                <Text style={[styles.todayText, { color: colors.accent }]}>Today</Text>
              </Pressable>
            </View>
          </Field>

          <Field label="Theatre" optional>
            <View style={[styles.inputRow, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
              <Ionicons name="location-outline" size={17} color={colors.textDim} />
              <TextInput
                value={theatre}
                onChangeText={setTheatre}
                placeholder="Theatre or venue name"
                placeholderTextColor={colors.textDim}
                style={[styles.input, { color: colors.text }]}
              />
            </View>
          </Field>

        </Card>

        {!loading && from !== 'diary' && recentEntries.length > 0 ? (
          <View style={styles.recentSection}>
            <View style={styles.recentHeader}>
              <Text style={[styles.recentTitle, { color: colors.text }]}>Recent entries</Text>
              <Text style={[styles.recentCount, { color: colors.textDim }]}>
                {library.entries.length} total
              </Text>
            </View>
            {recentEntries.map((entry) => (
              <View
                key={entry.id}
                style={[styles.recentRow, { backgroundColor: colors.surface, borderColor: colors.borderSoft }]}
              >
                <Poster
                  uri={resolvePoster(library, entry.movieId, entry.title)}
                  title={entry.title}
                  width={38}
                  radius={RADIUS.sm}
                />
                <View style={styles.recentText}>
                  <Text style={[styles.recentName, { color: colors.text }]} numberOfLines={1}>
                    {entry.title}
                  </Text>
                  <Text style={[styles.recentMeta, { color: colors.textDim }]}>
                    {formatDate(entry.watchedAt)}
                  </Text>
                </View>
                <Pressable
                  onPress={() => fillFromEntry(entry)}
                  style={styles.iconBtn}
                  accessibilityLabel="Edit entry"
                  hitSlop={6}
                >
                  <Ionicons name="create-outline" size={18} color={colors.textMuted} />
                </Pressable>
                <Pressable
                  onPress={() => handleDelete(entry)}
                  style={styles.iconBtn}
                  accessibilityLabel="Delete entry"
                  hitSlop={6}
                >
                  <Ionicons name="trash-outline" size={18} color={colors.rose} />
                </Pressable>
              </View>
            ))}
          </View>
        ) : null}

        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.accent} />
          </View>
        ) : null}
      </ScrollView>

      <View
        style={[
          styles.footer,
          { backgroundColor: colors.background, borderTopColor: colors.borderSoft, paddingBottom: insets.bottom + SPACE.md },
        ]}
      >
        {editingId ? (
          <ActionButton label="Cancel" variant="outline" onPress={resetForm} style={styles.footerCancel} />
        ) : null}
        <ActionButton
          label={editingId ? 'Update viewing' : 'Save to diary'}
          icon="checkmark"
          onPress={handleSave}
          loading={saving}
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
      <View style={[styles.stepBadge, { backgroundColor: colors.accentSoft }]}>
        <Text style={[styles.stepNumber, { color: colors.accent }]}>{step}</Text>
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
      <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>
        {label}
        {optional ? <Text style={{ color: colors.textDim }}>  (optional)</Text> : null}
      </Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.sm,
    marginHorizontal: SPACE.xl,
    marginBottom: SPACE.md,
    paddingHorizontal: SPACE.md,
    paddingVertical: 12,
    borderRadius: RADIUS.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  bannerText: {
    ...TYPE.small,
    fontWeight: '700',
    flex: 1,
  },
  section: {
    marginHorizontal: SPACE.xl,
    marginBottom: SPACE.md,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.sm,
    marginBottom: SPACE.md,
  },
  stepBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
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
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.sm,
    paddingHorizontal: SPACE.md,
    minHeight: 48,
    borderRadius: RADIUS.md,
    borderWidth: StyleSheet.hairlineWidth,
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
    marginBottom: SPACE.lg,
  },
  fieldLabel: {
    ...TYPE.caption,
    fontWeight: '700',
    marginBottom: SPACE.sm,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.sm,
  },
  flex: {
    flex: 1,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.sm,
    paddingHorizontal: SPACE.md,
    minHeight: 48,
    borderRadius: RADIUS.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  input: {
    ...TYPE.body,
    ...INPUT_RESET,
    flex: 1,
    padding: 0,
  },
  todayBtn: {
    minHeight: 48,
    paddingHorizontal: SPACE.md,
    borderRadius: RADIUS.md,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayText: {
    ...TYPE.small,
    fontWeight: '800',
  },
  recentSection: {
    paddingHorizontal: SPACE.xl,
    marginTop: SPACE.md,
  },
  recentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: SPACE.sm,
  },
  recentTitle: {
    ...TYPE.heading,
    fontSize: 15,
  },
  recentCount: {
    ...TYPE.caption,
  },
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.sm,
    padding: SPACE.sm,
    borderRadius: RADIUS.md,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: SPACE.sm,
  },
  recentText: {
    flex: 1,
  },
  recentName: {
    ...TYPE.small,
    fontWeight: '700',
  },
  recentMeta: {
    ...TYPE.caption,
    marginTop: 2,
  },
  iconBtn: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loading: {
    paddingTop: SPACE.xl,
    alignItems: 'center',
  },
  footer: {
    flexDirection: 'row',
    gap: SPACE.sm,
    paddingHorizontal: SPACE.xl,
    paddingTop: SPACE.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  footerCancel: {
    flex: 0.4,
  },
  footerSave: {
    flex: 1,
  },
});
