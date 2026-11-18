import React, { useMemo } from 'react';
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
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RADIUS, SERIF, TYPE, useTheme } from '../theme';
import { useLibrary } from '../hooks/useLibrary';
import { filmYear, resolvePoster, searchableFilms } from '../lib/library';
import { MONTH_NAMES, toDate } from '../lib/format';
import { theatreDisplay } from '../lib/theatres';
import { COMPANION_LABELS } from '../lib/stats';
import { Poster } from '../components/Poster';

interface FilmDetailScreenProps {
  /** Id of the film in the Film database. */
  filmId: string;
}

function longDate(value: string): string {
  const date = toDate(value);
  return `${date.getDate()} ${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`;
}

/** One film: poster, title, release year and every viewing you have logged of it. */
export default function FilmDetailScreen({ filmId }: FilmDetailScreenProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { library, loading } = useLibrary();

  const film = useMemo(
    () => searchableFilms(library).find((item) => item.id === filmId),
    [library, filmId]
  );
  const viewings = useMemo(
    () =>
      library.entries
        .filter((entry) => entry.movieId === filmId)
        .sort((a, b) => toDate(b.watchedAt).getTime() - toDate(a.watchedAt).getTime()),
    [library.entries, filmId]
  );

  const posterWidth = Math.round(Math.min(width * 0.5, 220));
  const year = film ? filmYear(film) : '';

  return (
    <View style={[styles.root, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : !film ? (
        <View style={styles.center}>
          <Text style={[styles.missing, { color: colors.textMuted }]}>This film could not be found.</Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
        >
          <View style={[styles.posterShadow, { shadowColor: colors.primary }]}>
            <Poster
              uri={resolvePoster(library, film.id, film.title) ?? film.posterPath}
              title={film.title}
              width={posterWidth}
              radius={RADIUS.xl}
            />
          </View>

          <Text style={[styles.title, { color: colors.text }]}>{film.title}</Text>
          {year ? <Text style={[styles.year, { color: colors.textMuted }]}>{year}</Text> : null}
          <View style={[styles.rule, { backgroundColor: colors.accent }]} />

          <View style={styles.sectionHead}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Your viewings</Text>
            <Text style={[styles.sectionCount, { color: colors.textMuted }]}>
              {viewings.length} {viewings.length === 1 ? 'time' : 'times'}
            </Text>
          </View>

          {viewings.length === 0 ? (
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.borderSoft }]}>
              <Text style={[styles.empty, { color: colors.textMuted }]}>
                You have not logged this film yet.
              </Text>
            </View>
          ) : (
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.borderSoft }]}>
              {viewings.map((entry, index) => {
                const place = theatreDisplay(entry, library.theatres);
                return (
                  <Pressable
                    key={entry.id}
                    onPress={() =>
                      router.push({ pathname: '/viewing/[entryId]', params: { entryId: entry.id } })
                    }
                    accessibilityRole="button"
                    accessibilityLabel={`Viewing on ${longDate(entry.watchedAt)}`}
                    style={({ pressed }) => [
                      styles.row,
                      index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.borderSoft },
                      pressed && { opacity: 0.7 },
                    ]}
                  >
                    <View style={[styles.iconBadge, { backgroundColor: colors.coralSoft }]}>
                      <Ionicons name="calendar" size={16} color={colors.coralInk} />
                    </View>
                    <View style={styles.rowText}>
                      <Text style={[styles.rowTitle, { color: colors.text }]}>
                        {longDate(entry.watchedAt)}
                      </Text>
                      {place ? (
                        <Text style={[styles.rowMeta, { color: colors.textMuted }]} numberOfLines={1}>
                          {place.name}
                        </Text>
                      ) : null}
                    </View>
                    {entry.companion ? (
                      <View style={[styles.tag, { backgroundColor: colors.coralSoft }]}>
                        <Text style={[styles.tagText, { color: colors.coralInk }]}>
                          {COMPANION_LABELS[entry.companion]}
                        </Text>
                      </View>
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
          )}
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
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 20,
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
  },
  posterShadow: {
    shadowOpacity: 0.22,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
    borderRadius: RADIUS.xl,
  },
  title: {
    fontFamily: SERIF,
    fontSize: 26,
    lineHeight: 32,
    fontWeight: '700',
    letterSpacing: -0.5,
    textAlign: 'center',
    marginTop: 18,
  },
  year: {
    fontSize: 15,
    fontWeight: '700',
    marginTop: 4,
    fontVariant: ['tabular-nums'],
  },
  rule: {
    width: 36,
    height: 2,
    borderRadius: 1,
    marginTop: 12,
    marginBottom: 18,
  },
  sectionHead: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginBottom: 8,
  },
  sectionTitle: {
    fontFamily: SERIF,
    fontSize: 17,
    fontWeight: '700',
  },
  sectionCount: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  card: {
    width: '100%',
    borderRadius: RADIUS.xl,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
  },
  empty: {
    ...TYPE.small,
    paddingVertical: 16,
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 54,
    paddingVertical: 8,
  },
  iconBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: {
    flex: 1,
    minWidth: 0,
  },
  rowTitle: {
    fontSize: 15,
    lineHeight: 19,
    fontWeight: '800',
  },
  rowMeta: {
    fontSize: 12.5,
    lineHeight: 16,
    fontWeight: '500',
    marginTop: 1,
  },
  tag: {
    paddingHorizontal: 8,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagText: {
    fontSize: 11,
    fontWeight: '800',
  },
});
