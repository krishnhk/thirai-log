import React, { useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
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
import { Chip } from '../components/Chip';
import { StatusPill } from '../components/StatusPill';
import { ActionButton } from '../components/ActionButton';

const STATUSES: EntryStatus[] = ['planned', 'watched', 'skipped', 'postponed'];

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

  const posterWidth = Math.round(Math.min(width * 0.5, 220));

  return (
    <View style={[styles.root, { backgroundColor: colors.background, paddingTop: insets.top }]}>
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

          <Text style={[styles.title, { color: colors.text }]}>{item.title}</Text>
          <Text style={[styles.year, { color: colors.textMuted }]}>{item.year || year} watchlist</Text>
          <View style={styles.pill}>
            <StatusPill status={item.status} />
          </View>

          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.borderSoft }]}>
            <Text style={[styles.label, { color: colors.textMuted }]}>Update status</Text>
            <View style={styles.chips}>
              {STATUSES.map((status) => (
                <Chip
                  compact
                  key={status}
                  label={status.charAt(0).toUpperCase() + status.slice(1)}
                  active={item.status === status}
                  onPress={() => updateStatus(status)}
                />
              ))}
            </View>

            <View style={styles.actions}>
              <ActionButton
                compact
                label={`Move to ${year + 1}`}
                icon="arrow-forward"
                variant="ghost"
                onPress={moveToNextYear}
                style={styles.action}
              />
              <ActionButton
                compact
                label="Remove"
                icon="trash-outline"
                variant="danger"
                onPress={removeMovie}
                style={styles.action}
              />
            </View>
            {busy ? <ActivityIndicator color={colors.accent} style={{ marginTop: SPACE.sm }} /> : null}
          </View>
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
  year: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 4,
  },
  pill: {
    marginTop: 10,
    marginBottom: 18,
  },
  card: {
    width: '100%',
    borderRadius: RADIUS.xl,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    gap: 10,
  },
  label: {
    ...TYPE.eyebrow,
    fontSize: 10,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  action: {
    flex: 1,
    minHeight: 42,
  },
});
