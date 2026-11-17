import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, type Href } from 'expo-router';
import { RADIUS, SERIF, TYPE, useTheme } from '../theme';
import { useLibrary } from '../hooks/useLibrary';
import { searchableFilms } from '../lib/library';
import { exportBackup } from '../lib/backup';
import { AppHeader } from '../components/AppHeader';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

/** One place for the collections: Theatres, Film database, Statistics and Backup. */
export default function LibraryScreen() {
  const { colors } = useTheme();
  const { library } = useLibrary();
  const films = searchableFilms(library).length;
  const theatres = library.theatres.length;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <AppHeader />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <Text style={[styles.title, { color: colors.text }]}>Library</Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
          Your theatres, films, numbers and backup.
        </Text>

        <View style={styles.grid}>
          <Tile
            icon="location"
            label="Theatres"
            hint={`${theatres} ${theatres === 1 ? 'theatre' : 'theatres'}`}
            onPress={() => router.push('/theatres' as Href)}
          />
          <Tile
            icon="film"
            label="Film database"
            hint={`${films} ${films === 1 ? 'film' : 'films'}`}
            onPress={() => router.push('/films' as Href)}
          />
          <Tile
            icon="stats-chart"
            label="Statistics"
            hint="Your year in numbers"
            onPress={() => router.push('/statistics' as Href)}
          />
          <Tile
            icon="share-outline"
            label="Backup"
            hint="Export your diary"
            onPress={() => exportBackup()}
          />
        </View>
      </ScrollView>
    </View>
  );
}

function Tile({
  icon,
  label,
  hint,
  onPress,
}: {
  icon: IconName;
  label: string;
  hint: string;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${label}. ${hint}`}
      style={({ pressed }) => [
        styles.tile,
        { backgroundColor: colors.surface, borderColor: colors.borderSoft },
        pressed && { opacity: 0.8 },
      ]}
    >
      <View style={[styles.badge, { backgroundColor: colors.coralSoft }]}>
        <Ionicons name={icon} size={20} color={colors.coralInk} />
      </View>
      <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
      <Text style={[styles.hint, { color: colors.textMuted }]} numberOfLines={1}>
        {hint}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 36,
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
  },
  title: {
    ...TYPE.title,
    fontSize: 26,
    lineHeight: 31,
    paddingHorizontal: 4,
  },
  subtitle: {
    ...TYPE.small,
    paddingHorizontal: 4,
    marginTop: 2,
    marginBottom: 14,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  tile: {
    width: '48.5%',
    minHeight: 124,
    padding: 14,
    gap: 6,
    borderRadius: RADIUS.xl,
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: '#1A2A42',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  badge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontFamily: SERIF,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
    marginTop: 4,
  },
  hint: {
    fontSize: 12.5,
    fontWeight: '600',
  },
});
