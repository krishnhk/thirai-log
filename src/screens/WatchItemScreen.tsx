import React, { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RADIUS, SERIF, SPACE, TYPE, useTheme } from '../theme';
import { useLibrary } from '../hooks/useLibrary';
import {
  mutateAnnualLists,
  resolvePoster,
  updateFilmPoster,
  type AnnualList,
  type EntryStatus,
  type WatchItem,
} from '../lib/library';
import { confirmAction } from '../lib/ui';
import { PosterPicker } from '../components/PosterPicker';

const STATUSES: EntryStatus[] = ['planned', 'watched', 'skipped'];

interface WatchItemScreenProps {
  /** Film id of the watchlist item. */
  itemId: string;
  /** Watchlist year the item belongs to. */
  year: number;
}

/** One watchlist film: poster, status, move to next year and remove. */
export default function WatchItemScreen({ itemId, year }: WatchItemScreenProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { library, loading, refresh } = useLibrary();
  const [busy, setBusy] = useState(false);

  const item: WatchItem | undefined = library.annual
    .find((list) => list.year === year)
    ?.movies.find((movie) => movie.movieId === itemId);

  const updateStatus = async (status: EntryStatus) => {
    if (!item) return;
    setBusy(true);
    try {
      await mutateAnnualLists((lists) =>
        lists.map((list) =>
          list.year === year
            ? {
                ...list,
                movies: list.movies.map((entry) =>
                  entry.movieId === item.movieId ? { ...entry, status } : entry
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

  const moveToNextYear = async () => {
    if (!item) return;
    setBusy(true);
    try {
      const targetYear = year + 1;
      const movedItem: WatchItem = { ...item, year: targetYear, status: 'planned' };

      await mutateAnnualLists((lists) => {
        const sourceIndex = lists.findIndex((list) => list.year === year);
        if (sourceIndex < 0) return lists;

        const source = lists[sourceIndex];
        const targetIndex = lists.findIndex((list) => list.year === targetYear);
        const target: AnnualList =
          targetIndex >= 0
            ? lists[targetIndex]
            : { id: `year-${targetYear}`, year: targetYear, title: `${targetYear} Watchlist`, movies: [] };

        let updated = lists.map((list, i) =>
          i === sourceIndex
            ? { ...source, movies: source.movies.filter((m) => m.movieId !== item.movieId) }
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
      router.back();
    } finally {
      setBusy(false);
    }
  };

  const removeMovie = () => {
    if (!item) return;
    confirmAction('Remove film', `Remove “${item.title}” from your ${year} watchlist?`, async () => {
      await mutateAnnualLists((lists) =>
        lists.map((list) =>
          list.year === year
            ? { ...list, movies: list.movies.filter((m) => m.movieId !== item.movieId) }
            : list
        )
      );
      await refresh();
      router.back();
    });
  };

  // A large poster, kept small enough to leave room for the status bar and the buttons on short phones.
  const posterWidth = Math.round(Math.min(width * 0.46, 190));

  return (
    <View style={[styles.root, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <LinearGradient
        colors={['#DDE6F4', 'rgba(250,245,234,0)']}
        style={styles.glow}
        pointerEvents="none"
      />
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : !item ? (
        <View style={styles.center}>
          <Text style={[styles.missing, { color: colors.textMuted }]}>This film is no longer on the list.</Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.content, { paddingVertical: 20 }]}
        >
          <View style={[styles.posterShadow, { shadowColor: colors.primary }]}>
            <PosterPicker
              uri={resolvePoster(library, item.movieId, item.title) ?? item.posterPath}
              title={item.title}
              movieId={item.movieId}
              width={posterWidth}
              onChange={async (uri) => {
                await updateFilmPoster(item.movieId, item.title, uri);
                await refresh();
              }}
            />
          </View>

          <Text style={[styles.title, { color: colors.text }]}>{item.title}</Text>
          <Text style={[styles.year, { color: colors.textMuted }]}>{item.year || year} watchlist</Text>

          {/* Status: one floating bar, tap a segment to set it. */}
          <View style={[styles.statusBar, { backgroundColor: colors.surface, shadowColor: colors.primary }]}>
            {STATUSES.map((status) => {
              const active = item.status === status;
              return (
                <Pressable
                  key={status}
                  onPress={() => updateStatus(status)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={`Set status to ${status}`}
                  style={[styles.segment, active && { backgroundColor: colors.primary }]}
                >
                  <Text style={[styles.segmentText, { color: active ? colors.primaryText : colors.textMuted }]}>
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.actions}>
            <Pressable
              onPress={moveToNextYear}
              accessibilityRole="button"
              style={({ pressed }) => [styles.action, { borderColor: colors.accent }, pressed && { opacity: 0.6 }]}
            >
              <Ionicons name="arrow-forward" size={16} color={colors.accent} />
              <Text style={[styles.actionLabel, { color: colors.accent }]}>Move to {year + 1}</Text>
            </Pressable>
            <Pressable
              onPress={removeMovie}
              accessibilityRole="button"
              style={({ pressed }) => [styles.action, { borderColor: colors.rose }, pressed && { opacity: 0.6 }]}
            >
              <Ionicons name="trash-outline" size={17} color={colors.rose} />
              <Text style={[styles.actionLabel, { color: colors.rose }]}>Remove</Text>
            </Pressable>
          </View>
          {busy ? <ActivityIndicator color={colors.accent} style={{ marginTop: SPACE.sm }} /> : null}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  missing: {
    ...TYPE.body,
    textAlign: 'center',
  },
  content: {
    // Fills the space and centres the poster and card, so top and bottom gaps are equal.
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
  },
  title: {
    fontFamily: SERIF,
    fontSize: 26,
    lineHeight: 32,
    fontWeight: '700',
    letterSpacing: -0.5,
    textAlign: 'center',
    marginTop: 18,
    width: '100%',
  },
  posterShadow: {
    shadowOpacity: 0.28,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
    borderRadius: RADIUS.xl,
  },
  glow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '55%',
  },
  year: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 4,
  },
  statusBar: {
    width: '100%',
    flexDirection: 'row',
    gap: 4,
    padding: 5,
    marginTop: 16,
    borderRadius: RADIUS.pill,
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 3,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 38,
    borderRadius: RADIUS.pill,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '800',
  },
  actions: {
    width: '100%',
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  action: {
    flex: 1,
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: RADIUS.pill,
    borderWidth: 1.5,
  },
  actionLabel: {
    fontSize: 14,
    fontWeight: '800',
  },
});
