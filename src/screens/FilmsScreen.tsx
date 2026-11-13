import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { INPUT_RESET, RADIUS, SPACE, TYPE, useTheme } from '../theme';
import { useLibrary } from '../hooks/useLibrary';
import { filmYear, resolvePoster, searchableFilms } from '../lib/library';
import { ScreenHeader } from '../components/ScreenHeader';
import { Poster } from '../components/Poster';
import { EmptyState } from '../components/EmptyState';
import { ActionButton } from '../components/ActionButton';

/** Lists every film in the database. Tap one to edit its title, year or poster. */
export default function FilmsScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { library, loading } = useLibrary();
  const [query, setQuery] = useState('');

  const films = useMemo(() => {
    const all = searchableFilms(library).sort(
      (a, b) =>
        a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }) ||
        filmYear(a).localeCompare(filmYear(b))
    );
    const needle = query.trim().toLowerCase();
    return needle ? all.filter((film) => film.title.toLowerCase().includes(needle)) : all;
  }, [library, query]);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: insets.bottom + SPACE.xxl,
          width: '100%',
          maxWidth: 720,
          alignSelf: 'center',
        }}
      >
        <ScreenHeader
          eyebrow="Database"
          title="Films"
          right={
            <Pressable
              onPress={() => router.back()}
              accessibilityRole="button"
              accessibilityLabel="Back"
              style={[styles.back, { backgroundColor: colors.surfaceAlt, borderColor: colors.borderSoft }]}
            >
              <Ionicons name="chevron-back" size={20} color={colors.text} />
            </Pressable>
          }
        />

        <View style={styles.pad}>
          <View style={[styles.searchRow, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
            <Ionicons name="search" size={17} color={colors.textDim} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search films"
              placeholderTextColor={colors.textDim}
              style={[styles.searchInput, INPUT_RESET, { color: colors.text }]}
              autoCorrect={false}
            />
          </View>
          <ActionButton
            label="Add a film"
            icon="add"
            variant="outline"
            onPress={() => router.push('/add-movie')}
            fullWidth
            style={styles.addButton}
          />
        </View>

        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.accent} />
          </View>
        ) : films.length === 0 ? (
          <View style={styles.pad}>
            <EmptyState icon="film-outline" title={query.trim() ? 'No matching films' : 'No films yet'} compact />
          </View>
        ) : (
          <View style={styles.pad}>
            {films.map((film) => {
              const year = filmYear(film);
              return (
                <Pressable
                  key={film.id}
                  onPress={() => router.push({ pathname: '/add-movie', params: { id: film.id } })}
                  accessibilityRole="button"
                  accessibilityLabel={`Edit ${film.title}`}
                  style={({ pressed }) => [
                    styles.row,
                    { backgroundColor: colors.surface, borderColor: colors.borderSoft },
                    pressed && { opacity: 0.8 },
                  ]}
                >
                  <Poster
                    uri={resolvePoster(library, film.id, film.title) ?? film.posterPath}
                    title={film.title}
                    width={44}
                    radius={RADIUS.sm}
                  />
                  <View style={styles.rowText}>
                    <Text style={[styles.rowTitle, { color: colors.text }]} numberOfLines={1}>
                      {film.title}
                    </Text>
                    {year ? <Text style={[styles.rowMeta, { color: colors.textDim }]}>{year}</Text> : null}
                  </View>
                  <Ionicons name="create-outline" size={18} color={colors.textDim} />
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  pad: {
    paddingHorizontal: SPACE.xl,
  },
  back: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
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
    flex: 1,
    padding: 0,
  },
  addButton: {
    marginTop: SPACE.sm,
    marginBottom: SPACE.lg,
  },
  loading: {
    paddingTop: SPACE.xxl,
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.md,
    padding: SPACE.sm,
    borderRadius: RADIUS.lg,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: SPACE.sm,
  },
  rowText: {
    flex: 1,
  },
  rowTitle: {
    ...TYPE.body,
    fontWeight: '700',
  },
  rowMeta: {
    ...TYPE.caption,
    marginTop: 2,
  },
});
