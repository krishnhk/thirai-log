import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
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
  const [saving, setSaving] = useState(false);
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
    });
    return () => {
      active = false;
    };
  }, [editId]);

  const save = async () => {
    const name = title.trim();
    if (!name || saving) return;

    const yearText = year.trim();
    const yearNumber = yearText ? Number(yearText) : undefined;
    const currentYear = new Date().getFullYear();
    if (
      yearNumber !== undefined &&
      (!Number.isInteger(yearNumber) || yearNumber < 1888 || yearNumber > currentYear + 1)
    ) {
      notify('Check the year', `Enter a year between 1888 and ${currentYear + 1}.`);
      return;
    }

    setSaving(true);
    try {
      const library = await loadLibrary();
      const key = name.toLowerCase();
      const yearKey = yearNumber ? String(yearNumber) : '';
      // Same title is fine in a different year, so a film counts as a duplicate only when both match.
      const duplicate = searchableFilms(library).some(
        (film) =>
          film.id !== editId && film.title.trim().toLowerCase() === key && filmYear(film) === yearKey
      );
      if (duplicate) {
        notify('Already added', `“${name}”${yearNumber ? ` (${yearNumber})` : ''} is already in your films.`);
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
          releaseDate: yearNumber ? `${yearNumber}-06-15` : undefined,
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
      <View style={[styles.header, { paddingTop: insets.top + SPACE.md }]}>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Back"
          style={[styles.back, { backgroundColor: colors.surfaceAlt, borderColor: colors.borderSoft }]}
        >
          <Ionicons name="chevron-back" size={20} color={colors.text} />
        </Pressable>
        <Text style={[styles.title, { color: colors.text }]}>{editId ? 'Edit film' : 'Add a film'}</Text>
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: insets.bottom + SPACE.xxl }}
      >
        <Card style={styles.card}>
          <View style={styles.topRow}>
            <PosterPicker
              uri={poster}
              title={title || 'New film'}
              movieId={draftId}
              width={104}
              onChange={setPoster}
            />
            <View style={styles.fields}>
              <Text style={[styles.label, { color: colors.textMuted }]}>Title</Text>
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="Film title"
                placeholderTextColor={colors.textDim}
                autoFocus={!params.title && !editId}
                style={[
                  styles.input,
                  INPUT_RESET,
                  { color: colors.text, backgroundColor: colors.surfaceAlt, borderColor: colors.border },
                ]}
              />

              <Text style={[styles.label, { color: colors.textMuted }]}>Year</Text>
              <TextInput
                value={year}
                onChangeText={setYear}
                placeholder="Optional"
                placeholderTextColor={colors.textDim}
                keyboardType="number-pad"
                maxLength={4}
                style={[
                  styles.input,
                  INPUT_RESET,
                  { color: colors.text, backgroundColor: colors.surfaceAlt, borderColor: colors.border },
                ]}
              />
            </View>
          </View>
        </Card>

        <View style={styles.actions}>
          <ActionButton label={editId ? 'Save changes' : 'Save'} icon="checkmark" onPress={save} loading={saving} disabled={!title.trim()} fullWidth />
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
    gap: SPACE.md,
    paddingHorizontal: SPACE.xl,
    paddingBottom: SPACE.lg,
  },
  back: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...TYPE.heading,
    fontSize: 20,
  },
  card: {
    marginHorizontal: SPACE.xl,
  },
  topRow: {
    flexDirection: 'row',
    gap: SPACE.lg,
  },
  fields: {
    flex: 1,
    gap: SPACE.sm,
  },
  label: {
    ...TYPE.caption,
    fontWeight: '700',
    marginTop: SPACE.xs,
  },
  input: {
    ...TYPE.body,
    minHeight: 46,
    paddingHorizontal: SPACE.md,
    borderRadius: RADIUS.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  actions: {
    paddingHorizontal: SPACE.xl,
    marginTop: SPACE.xl,
  },
});
