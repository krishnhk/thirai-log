import React, { useMemo } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RADIUS, SERIF, TYPE, useTheme } from '../theme';
import { useLibrary } from '../hooks/useLibrary';
import { resolvePoster } from '../lib/library';
import { MONTH_NAMES, toDate } from '../lib/format';
import { viewingsAtTheatre } from '../lib/theatres';
import { COMPANION_LABELS } from '../lib/stats';
import { Card } from '../components/Card';
import { Poster } from '../components/Poster';

interface TheatreDetailScreenProps {
  /** Id of the theatre in the Theatres list. */
  theatreId: string;
}

function longDate(value: string): string {
  const date = toDate(value);
  return `${date.getDate()} ${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`;
}

/** One theatre: its name and district, and every viewing you have logged there, newest first. */
export default function TheatreDetailScreen({ theatreId }: TheatreDetailScreenProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { library, loading } = useLibrary();

  const theatre = library.theatres.find((item) => item.id === theatreId);
  const visits = useMemo(
    () =>
      theatre
        ? viewingsAtTheatre(library.entries, theatre).sort(
            (a, b) => toDate(b.watchedAt).getTime() - toDate(a.watchedAt).getTime()
          )
        : [],
    [library.entries, theatre]
  );
  const films = useMemo(() => new Set(visits.map((entry) => entry.movieId || entry.title)).size, [visits]);
  const spent = useMemo(
    () => visits.reduce((sum, entry) => sum + (typeof entry.price === 'number' ? entry.price : 0), 0),
    [visits]
  );

  return (
    <View style={[styles.root, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : !theatre ? (
        <View style={styles.center}>
          <Text style={[styles.missing, { color: colors.textMuted }]}>This theatre could not be found.</Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
        >
          <Text style={[styles.title, { color: colors.text }]}>{theatre.name}</Text>
          {theatre.district ? (
            <Text style={[styles.district, { color: colors.textMuted }]}>{theatre.district}</Text>
          ) : null}
          <Text style={[styles.summary, { color: colors.textMuted }]}>
            {visits.length} {visits.length === 1 ? 'visit' : 'visits'} · {films} {films === 1 ? 'film' : 'films'}
            {spent > 0 ? ` · ₹${spent.toLocaleString('en-IN')} spent` : ''}
          </Text>
          <View style={[styles.rule, { backgroundColor: colors.border }]} />

          {visits.length === 0 ? (
            <Card style={styles.card}>
              <Text style={[styles.empty, { color: colors.textMuted }]}>
                You have not logged a visit to this theatre yet.
              </Text>
            </Card>
          ) : (
            <Card style={styles.card}>
              {visits.map((entry, index) => (
                <View
                  key={entry.id}
                  style={[
                    styles.row,
                    index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
                  ]}
                >
                  <Poster
                    uri={resolvePoster(library, entry.movieId, entry.title)}
                    title={entry.title}
                    width={40}
                    radius={RADIUS.sm}
                  />
                  <View style={styles.rowText}>
                    <Text style={[styles.rowTitle, { color: colors.text }]} numberOfLines={2}>
                      {entry.title}
                    </Text>
                    <Text style={[styles.rowMeta, { color: colors.textMuted }]}>{longDate(entry.watchedAt)}</Text>
                  </View>
                  {entry.companion ? (
                    <Text style={[styles.tag, { color: colors.accent }]}>{COMPANION_LABELS[entry.companion]}</Text>
                  ) : null}
                </View>
              ))}
            </Card>
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
    paddingHorizontal: 16,
    paddingTop: 22,
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
  },
  title: {
    fontFamily: SERIF,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  district: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 2,
  },
  summary: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 8,
  },
  rule: {
    height: StyleSheet.hairlineWidth * 2,
    marginTop: 14,
    marginBottom: 14,
  },
  card: {
    width: '100%',
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
    gap: 12,
    paddingVertical: 10,
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
    marginTop: 2,
  },
  tag: {
    fontSize: 12,
    fontWeight: '800',
  },
});
