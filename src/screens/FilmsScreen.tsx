import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { INPUT_RESET, RADIUS, SPACE, TYPE, useTheme } from '../theme';
import { useLibrary } from '../hooks/useLibrary';
import { filmYear, resolvePoster, searchableFilms } from '../lib/library';
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
          paddingBottom: insets.bottom + SPACE.xl,
          width: '100%',
          maxWidth: 720,
          alignSelf: 'center',
        }}
      >
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Back"
            hitSlop={4}
            style={({ pressed }) => [
              styles.back,
              { backgroundColor: colors.surface, borderColor: colors.borderSoft },
              pressed && { opacity: 0.7 },
            ]}
          >
            <Ionicons name="chevron-back" size={20} color={colors.coralInk} />
          </Pressable>
          <Text style={[styles.title, { color: colors.text }]}>Films</Text>
        </View>

        <View style={styles.toolbar}>
          <View style={[styles.searchRow, { backgroundColor: colors.backgroundAlt, borderColor: colors.borderSoft }]}>
            <Ionicons name="search" size={16} color={colors.textMuted} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search films"
              placeholderTextColor={colors.textMuted}
              style={[styles.searchInput, INPUT_RESET, { color: colors.text }]}
              autoCorrect={false}
            />
          </View>
          <ActionButton
            label="Add a film"
            icon="add"
            compact
            onPress={() => router.push('/add-movie')}
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
                    width={40}
                    radius={RADIUS.md}
                  />
                  <View style={styles.rowText}>
                    <Text style={[styles.rowTitle, { color: colors.text }]} numberOfLines={3}>
                      {film.title}
                    </Text>
                    {year ? <Text style={[styles.rowMeta, { color: colors.textMuted }]}>{year}</Text> : null}
                  </View>
                  <View style={[styles.editBadge, { backgroundColor: colors.surfaceAlt }]}>
                    <Ionicons name="pencil" size={14} color={colors.coralInk} />
                  </View>
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
    paddingHorizontal: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  title: {
    ...TYPE.title,
    fontSize: 24,
    lineHeight: 28,
  },
  back: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#142A45',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  searchRow: {
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
  searchInput: {
    ...TYPE.body,
    flex: 1,
    padding: 0,
  },
  addButton: {
    minHeight: 42,
    paddingHorizontal: 14,
  },
  loading: {
    paddingTop: SPACE.xxl,
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 8,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 6,
    shadowColor: '#142A45',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },
  rowText: {
    flex: 1,
    minWidth: 0,
  },
  rowTitle: {
    fontSize: 15,
    lineHeight: 19,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  rowMeta: {
    fontSize: 12.5,
    lineHeight: 16,
    fontWeight: '600',
    marginTop: 2,
  },
  editBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
