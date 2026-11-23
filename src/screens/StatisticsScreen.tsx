import React, { useMemo } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { SPACE, RADIUS, SERIF, TYPE, useTheme } from '../theme';
import { useLibrary } from '../hooks/useLibrary';
import { resolvePoster, type ViewingEntry } from '../lib/library';
import { formatDate, toDate } from '../lib/format';
import { companionStats } from '../lib/stats';
import { AppHeader } from '../components/AppHeader';
import { Card } from '../components/Card';
import { EmptyState } from '../components/EmptyState';
import { Poster } from '../components/Poster';
import { RatingStars } from '../components/RatingStars';

/** One of the small cards under the hero number: a value and a short label. */
function StatCard({ label, value, small }: { label: string; value: string | number; small?: boolean }) {
  const { colors } = useTheme();
  return (
    <View
      style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.borderSoft }]}
      accessibilityLabel={`${label}: ${value}`}
    >
      <Text style={[styles.statValue, small && styles.statValueSmall, { color: colors.text }]} numberOfLines={1}>
        {value}
      </Text>
      <Text style={[styles.statLabel, { color: colors.textMuted }]}>{label}</Text>
    </View>
  );
}

export default function StatisticsScreen() {
  const { colors } = useTheme();
  const { library, loading } = useLibrary();

  const stats = useMemo(() => {
    const entries = library.entries;
    const uniqueMap = new Map<string, ViewingEntry>();
    entries.forEach((entry) => {
      if (!uniqueMap.has(entry.movieId)) uniqueMap.set(entry.movieId, entry);
    });

    const filmsByYear: Record<number, Set<string>> = {};
    const visitsByYear: Record<number, number> = {};
    const spentByYear: Record<number, number> = {};
    let spentTotal = 0;
    entries.forEach((entry) => {
      const date = toDate(entry.watchedAt);
      visitsByYear[date.getFullYear()] = (visitsByYear[date.getFullYear()] ?? 0) + 1;
      if (typeof entry.price === 'number') {
        spentByYear[date.getFullYear()] = (spentByYear[date.getFullYear()] ?? 0) + entry.price;
        spentTotal += entry.price;
      }
      (filmsByYear[date.getFullYear()] ??= new Set<string>()).add(entry.movieId || entry.title.toLowerCase());
    });

    const topRated: ViewingEntry[] = [];
    const seenTop = new Set<string>();
    [...entries]
      .filter((entry) => typeof entry.rating === 'number' && (entry.rating ?? 0) > 0)
      .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
      .forEach((entry) => {
        if (seenTop.has(entry.movieId)) return;
        seenTop.add(entry.movieId);
        topRated.push(entry);
      });

    return {
      films: uniqueMap.size,
      visits: entries.length,
      yearOverYear: Object.entries(filmsByYear)
        .map(([label, films]) => ({ label, value: films.size }))
        .sort((a, b) => Number(a.label) - Number(b.label)),
      spentTotal,
      spentOverYear: Object.entries(spentByYear)
        .map(([label, value]) => ({ label, value: Math.round(value * 100) / 100 }))
        .sort((a, b) => Number(a.label) - Number(b.label)),
      visitsOverYear: Object.entries(visitsByYear)
        .map(([label, value]) => ({ label, value }))
        .sort((a, b) => Number(a.label) - Number(b.label)),
      topRated: topRated.slice(0, 5),
    };
  }, [library]);

  const hasSpend = stats.spentOverYear.length > 0;

  // One row per year, newest first: films, theatre visits and (when entered) the amount spent.
  const yearRows = useMemo(() => {
    const films = new Map(stats.yearOverYear.map((item) => [item.label, item.value]));
    const spent = new Map(stats.spentOverYear.map((item) => [item.label, item.value]));
    return [...stats.visitsOverYear]
      .sort((a, b) => Number(b.label) - Number(a.label))
      .map((item) => ({
        year: item.label,
        films: films.get(item.label) ?? 0,
        visits: item.value,
        spent: spent.get(item.label),
      }));
  }, [stats]);

  // Solo and Group count every year, not only the current one.
  const companion = useMemo(() => companionStats(library.entries), [library.entries]);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <AppHeader title="Statistics" subtitle="Your viewing, in numbers." />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: 36,
          width: '100%',
          maxWidth: 720,
          alignSelf: 'center',
        }}
      >
        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.accent} />
          </View>
        ) : stats.visits === 0 ? (
          <View style={styles.emptyWrap}>
            <EmptyState
              icon="stats-chart-outline"
              title="No statistics yet"
              message="Log a few theatre visits and your viewing patterns will come to life here."
              actionLabel="Log a viewing"
              onAction={() => router.navigate('/log')}
            />
          </View>
        ) : (
          <>
            <View style={styles.hero}>
              <Text style={[styles.heroLabel, { color: colors.textMuted }]}>FILMS WATCHED</Text>
              <Text style={[styles.heroNumber, { color: colors.text }]} accessibilityLabel={`${stats.films} films watched`}>
                {stats.films}
              </Text>
              <Text style={[styles.heroSub, { color: colors.textMuted }]}>
                in {stats.visits} theatre {stats.visits === 1 ? 'visit' : 'visits'}
              </Text>
            </View>

            <View style={styles.trio}>
              <StatCard label="SOLO" value={companion.alone.viewings} />
              <StatCard label="GROUP" value={companion.company.viewings} />
              {hasSpend ? (
                <StatCard label="SPENT" value={`₹${stats.spentTotal.toLocaleString('en-IN')}`} small />
              ) : null}
            </View>
            {companion.unanswered > 0 ? (
              <Text style={[styles.unansweredNote, { color: colors.textMuted }]}>
                {companion.unanswered} {companion.unanswered === 1 ? 'viewing' : 'viewings'}{' '}
                {companion.unanswered === 1 ? 'has' : 'have'} no answer yet.
              </Text>
            ) : null}

            <Text style={[styles.sectionTitle, { color: colors.text }]}>By year</Text>
            <Card style={styles.section}>
              <View style={styles.tableHead}>
                <Text style={[styles.th, styles.colYear, { color: colors.textMuted }]}>YEAR</Text>
                <Text style={[styles.th, styles.colNum, { color: colors.textMuted }]}>MOVIES</Text>
                <Text style={[styles.th, styles.colNum, { color: colors.textMuted }]}>VISITS</Text>
                {hasSpend ? (
                  <Text style={[styles.th, styles.colSpent, { color: colors.textMuted }]}>SPENT</Text>
                ) : null}
              </View>
              {yearRows.map((row) => (
                <View key={row.year} style={[styles.tableRow, { borderTopColor: colors.borderSoft }]}>
                  <Text style={[styles.tdYear, styles.colYear, { color: colors.text }]}>{row.year}</Text>
                  <Text style={[styles.td, styles.colNum, { color: colors.text }]}>{row.films}</Text>
                  <Text style={[styles.td, styles.colNum, { color: colors.text }]}>{row.visits}</Text>
                  {hasSpend ? (
                    <Text style={[styles.td, styles.colSpent, { color: colors.text }]}>
                      {row.spent !== undefined ? `₹${row.spent.toLocaleString('en-IN')}` : '—'}
                    </Text>
                  ) : null}
                </View>
              ))}
            </Card>

            {stats.topRated.length > 0 ? (
              <View style={styles.section}>
                <View style={styles.cardHeader}>
                  <Text style={[styles.cardTitle, { color: colors.text }]}>Highest rated</Text>
                  <RatingStars value={5} size={13} />
                </View>
                {stats.topRated.map((entry) => (
                  <Pressable
                    key={entry.id}
                    onPress={() => router.navigate({ pathname: '/log', params: { editEntryId: entry.id } })}
                    style={({ pressed }) => [
                      styles.favRow,
                      { backgroundColor: colors.surface, borderColor: colors.borderSoft },
                      pressed && { opacity: 0.8 },
                    ]}
                  >
                    <Poster
                      uri={resolvePoster(library, entry.movieId, entry.title)}
                      title={entry.title}
                      width={36}
                      radius={RADIUS.md}
                    />
                    <View style={styles.favText}>
                      <Text style={[styles.favTitle, { color: colors.text }]} numberOfLines={1}>
                        {entry.title}
                      </Text>
                      <Text style={[styles.favMeta, { color: colors.textMuted }]}>
                        {formatDate(entry.watchedAt)}
                      </Text>
                    </View>
                    <RatingStars value={entry.rating ?? 0} size={12} showValue />
                  </Pressable>
                ))}
              </View>
            ) : null}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  loading: {
    paddingTop: SPACE.xxxl,
    alignItems: 'center',
  },
  emptyWrap: {
    paddingHorizontal: 12,
  },
  hero: {
    alignItems: 'center',
    marginTop: 14,
    marginBottom: 14,
  },
  heroLabel: {
    ...TYPE.eyebrow,
    fontSize: 10,
    letterSpacing: 1.4,
  },
  heroNumber: {
    fontFamily: SERIF,
    fontSize: 68,
    lineHeight: 76,
    fontWeight: '700',
    letterSpacing: -1.5,
    fontVariant: ['tabular-nums'],
  },
  heroSub: {
    fontSize: 13,
    fontWeight: '600',
  },
  trio: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
  },
  statCard: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 6,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: '#1A2A42',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },
  statValue: {
    fontFamily: SERIF,
    fontSize: 26,
    lineHeight: 30,
    fontWeight: '700',
    letterSpacing: -0.5,
    fontVariant: ['tabular-nums'],
  },
  statValueSmall: {
    fontSize: 18,
    lineHeight: 30,
  },
  statLabel: {
    ...TYPE.eyebrow,
    fontSize: 9.5,
    letterSpacing: 1,
    marginTop: 2,
  },
  unansweredNote: {
    ...TYPE.small,
    paddingHorizontal: 16,
    marginTop: 8,
  },
  sectionTitle: {
    fontFamily: SERIF,
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.4,
    marginHorizontal: 16,
    marginTop: 18,
    marginBottom: 8,
  },
  tableHead: {
    flexDirection: 'row',
    paddingBottom: 6,
  },
  th: {
    ...TYPE.eyebrow,
    fontSize: 9,
    letterSpacing: 1,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  tdYear: {
    fontFamily: SERIF,
    fontSize: 17,
    fontWeight: '700',
  },
  td: {
    fontSize: 15,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  colYear: {
    flex: 1.1,
  },
  colNum: {
    flex: 1,
  },
  colSpent: {
    flex: 1.5,
    textAlign: 'right',
  },
  section: {
    marginHorizontal: 12,
    marginBottom: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACE.sm,
  },
  cardTitle: {
    ...TYPE.heading,
    fontSize: 15,
    fontWeight: '800',
  },
  cardMeta: {
    ...TYPE.eyebrow,
    fontSize: 10,
  },
  favRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 8,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 6,
  },
  favText: {
    flex: 1,
  },
  favTitle: {
    ...TYPE.small,
    fontWeight: '700',
  },
  favMeta: {
    ...TYPE.caption,
    marginTop: 2,
  },
});
