import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SPACE, RADIUS, TYPE, INPUT_RESET, useTheme } from '../theme';
import { upsertMovie } from '../api/movies';
import { editFilm, filmYear, loadLibrary, resolvePoster, searchableFilms } from '../lib/library';
import { notify } from '../lib/ui';
import { Card } from '../components/Card';
import { PosterPicker } from '../components/PosterPicker';
import { ActionButton } from '../components/ActionButton';

function FieldError({ text }: { text: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.errorRow} accessibilityRole="alert">
      <Ionicons name="alert-circle" size={13} color={colors.rose} />
      <Text style={[styles.errorText, { color: colors.rose }]}>{text}</Text>
    </View>
  );
}

/**
 * Adds a film to the app's database by hand, or edits one when an `id` is passed.
 * Search only shows films saved here.
 */
export default function AddMovieScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ title?: string; id?: string }>();
  const editId = params.id;

  const [title, setTitle] = useState(params.title ?? '');
  const [year, setYear] = useState('');
  const [poster, setPoster] = useState<string | undefined>(undefined);
  const [initialPoster, setInitialPoster] = useState<string | undefined>(undefined);
  // The film as saved, so Save can stay disabled until something changes.
  const [initial, setInitial] = useState<{ title: string; year: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [draftId] = useState(() => `draft-${Date.now()}`);

  // Edit mode: fill the form from the film being edited.
  useEffect(() => {
    if (!editId) return;
    let active = true;
    loadLibrary().then((library) => {
      if (!active) return;
      const film = searchableFilms(library).find((item) => item.id === editId);
      if (!film) return;
      const currentPoster = resolvePoster(library, film.id, film.title) ?? film.posterPath;
      setTitle(film.title);
      setYear(filmYear(film));
      setPoster(currentPoster);
      setInitialPoster(currentPoster);
      setInitial({ title: film.title.trim(), year: filmYear(film) });
    });
    return () => {
      active = false;
    };
  }, [editId]);

  const currentYear = new Date().getFullYear();
  const maxYear = currentYear + 1;
  const yearText = year.trim();
  const yearNumber = Number(yearText);
  const titleError = title.trim() ? null : 'Enter the film title.';
  const yearError = !yearText
    ? 'Enter the release year.'
    : !/^\d{4}$/.test(yearText) || yearNumber < 1888 || yearNumber > maxYear
      ? `Enter a valid year between 1888 and ${maxYear}.`
      : null;

  // Editing with nothing changed (or the film not loaded yet): Save stays disabled.
  const unchanged =
    Boolean(editId) &&
    (initial === null ||
      (title.trim() === initial.title && yearText === initial.year && poster === initialPoster));

  const save = async () => {
    if (saving) return;
    setSubmitted(true);
    if (titleError || yearError) return;
    const name = title.trim();

    setSaving(true);
    try {
      const library = await loadLibrary();
      const key = name.toLowerCase();
      const yearKey = String(yearNumber);
      // Same title is fine in a different year, so a film counts as a duplicate only when both match.
      const duplicate = searchableFilms(library).some(
        (film) =>
          film.id !== editId && film.title.trim().toLowerCase() === key && filmYear(film) === yearKey
      );
      if (duplicate) {
        notify('Already added', `“${name}” (${yearNumber}) is already in your films.`);
        return;
      }

      if (editId) {
        await editFilm(editId, {
          title: name,
          year: yearNumber,
          posterPath: poster !== initialPoster ? poster : undefined,
        });
      } else {
        await upsertMovie({
          id: `manual-${key.replace(/[^a-z0-9]+/g, '-')}-${Date.now()}`,
          title: name,
          releaseDate: `${yearNumber}-06-15`,
          posterPath: poster,
        });
      }
      router.back();
    } catch {
      notify('Could not save', 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={[styles.title, { color: colors.text }]}>{editId ? 'Edit Film' : 'Add a Film'}</Text>
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: insets.bottom + SPACE.xl }}
      >
        <Card style={styles.card}>
          <View style={styles.topRow}>
            <PosterPicker
              uri={poster}
              title={title || 'New film'}
              movieId={draftId}
              width={96}
              onChange={setPoster}
              uploadPlaceholder
            />
            <View style={styles.fields}>
              <View>
                <Text style={[styles.label, { color: colors.text }]}>
                  Title<Text style={{ color: colors.rose }}> *</Text>
                </Text>
                <TextInput
                  value={title}
                  onChangeText={setTitle}
                  placeholder="Film title"
                  placeholderTextColor={colors.textMuted}
                  autoFocus={!params.title && !editId}
                  accessibilityLabel="Title, required"
                  multiline={false}
                  style={[
                    styles.input,
                    INPUT_RESET,
                    {
                      color: colors.text,
                      backgroundColor: colors.background,
                      borderColor: submitted && titleError ? colors.rose : colors.border,
                    },
                  ]}
                />
                {submitted && titleError ? <FieldError text={titleError} /> : null}
              </View>

              <View>
                <Text style={[styles.label, { color: colors.text }]}>
                  Year<Text style={{ color: colors.rose }}> *</Text>
                </Text>
                <TextInput
                  value={year}
                  onChangeText={setYear}
                  placeholder="e.g. 2024"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="number-pad"
                  maxLength={4}
                  accessibilityLabel="Release year, required"
                  style={[
                    styles.input,
                    INPUT_RESET,
                    {
                      color: colors.text,
                      backgroundColor: colors.background,
                      borderColor: submitted && yearError ? colors.rose : colors.border,
                    },
                  ]}
                />
                {submitted && yearError ? <FieldError text={yearError} /> : null}
              </View>
            </View>
          </View>
          <Text style={[styles.required, { color: colors.textMuted }]}>
            <Text style={{ color: colors.rose }}>*</Text> Required. The poster is optional.
          </Text>
        </Card>

        <View style={styles.actions}>
          <ActionButton
            label={editId ? 'Save changes' : 'Save film'}
            icon="checkmark"
            onPress={save}
            loading={saving}
            disabled={unchanged}
            fullWidth
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 12,
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
  title: {
    ...TYPE.title,
    fontSize: 24,
    lineHeight: 28,
  },
  card: {
    marginHorizontal: 12,
  },
  topRow: {
    flexDirection: 'row',
    gap: 14,
  },
  fields: {
    flex: 1,
    minWidth: 0,
    gap: 10,
  },
  label: {
    ...TYPE.caption,
    fontWeight: '800',
    marginBottom: 5,
  },
  input: {
    ...TYPE.body,
    height: 46,
    paddingHorizontal: SPACE.md,
    borderRadius: RADIUS.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 4,
    marginTop: 5,
  },
  errorText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
  },
  required: {
    ...TYPE.caption,
    marginTop: 12,
  },
  actions: {
    paddingHorizontal: 12,
    marginTop: 12,
  },
});
