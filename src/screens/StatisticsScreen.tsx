import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { SPACE, RADIUS, TYPE, useTheme } from '../theme';
import { useLibrary } from '../hooks/useLibrary';
import { resolvePoster, type ViewingEntry } from '../lib/library';
import { formatDate, monthShort, MONTH_NAMES, toDate } from '../lib/format';
import { companionStats, viewingsFilmsNote } from '../lib/stats';
import { AppHeader } from '../components/AppHeader';
import { Card } from '../components/Card';
import { EmptyState } from '../components/EmptyState';
import { MonthChart } from '../components/MonthChart';
import { BarList } from '../components/BarList';
import { Poster } from '../components/Poster';
import { RatingStars } from '../components/RatingStars';

function MiniStat({
  label,
  value,
  icon,
  tint,
  hint,
  note,
}: {
  label: string;
  value: string | number;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  tint: string;
  hint: string;
  /** Optional extra line under the hint. */
  note?: string | null;
}) {
  const { colors } = useTheme();
  return (
    <View style={[styles.mini, { backgroundColor: colors.surface, borderColor: colors.borderSoft }]}>
      <View style={[styles.miniIcon, { backgroundColor: `${tint}22` }]}>
        <Ionicons name={icon} size={16} color={tint} />
      </View>
      <View style={styles.miniText}>
        <Text style={[styles.miniValue, { color: colors.text }]} numberOfLines={1}>
          {value}
        </Text>
        <Text style={[styles.miniLabel, { color: colors.text }]}>{label}</Text>
        <Text style={[styles.miniHint, { color: colors.textMuted }]} numberOfLines={1}>
          {hint}
        </Text>
        {note ? (
          <Text style={[styles.miniHint, { color: colors.textMuted }]} numberOfLines={2}>
            {note}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

export default function StatisticsScreen() {
  const { colors } = useTheme();
  const { library, loading } = useLibrary();
  const year = new Date().getFullYear();
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());

  const stats = useMemo(() => {
    const entries = library.entries;
    const uniqueMap = new Map<string, ViewingEntry>();
    entries.forEach((entry) => {
      if (!uniqueMap.has(entry.movieId)) uniqueMap.set(entry.movieId, entry);
    });


    // Bucket list across every year.
    const allBucket = library.annual.flatMap((list) => list.movies);
    const bucketTotal = allBucket.length;
    const bucketWatched = allBucket.filter((movie) => movie.status === 'watched').length;

    const monthlyCounts = Array.from({ length: 12 }, () => 0);
    const yearlyCounts: Record<number, number> = {};
    entries.forEach((entry) => {
      const date = toDate(entry.watchedAt);
      yearlyCounts[date.getFullYear()] = (yearlyCounts[date.getFullYear()] ?? 0) + 1;
      if (date.getFullYear() === year) {
        monthlyCounts[date.getMonth()] += 1;
      }
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
      bucketTotal,
      bucketWatched,
      monthlyCounts,
      yearOverYear: Object.entries(yearlyCounts)
        .map(([label, value]) => ({ label, value }))
        .sort((a, b) => Number(a.label) - Number(b.label)),
      topRated: topRated.slice(0, 5),
    };
  }, [library, year]);

  // Solo and Group count every year, not only the current one.
  const companion = useMemo(() => companionStats(library.entries), [library.entries]);
  const completion =
    stats.bucketTotal > 0 ? Math.round((stats.bucketWatched / stats.bucketTotal) * 100) : 0;
  const monthlyPeak = Math.max(...stats.monthlyCounts);
  const peakMonthIndex = stats.monthlyCounts.indexOf(monthlyPeak);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <AppHeader />

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
            <View style={styles.statGrid}>
              <View style={styles.statRow}>
                <MiniStat label="Films logged" value={stats.films} icon="film-outline" tint={colors.accent} hint="all years" />
                <MiniStat label="Theatre visits" value={stats.visits} icon="ticket-outline" tint={colors.teal} hint="all years" />
              </View>
              <View style={styles.statRow}>
                <MiniStat
                  label="Solo"
                  value={companion.alone.viewings}
                  icon="person-outline"
                  tint={colors.primary}
                  hint="all years"
                  note={viewingsFilmsNote(companion.alone)}
                />
                <MiniStat
                  label="Group"
                  value={companion.company.viewings}
                  icon="people-outline"
                  tint={colors.teal}
                  hint="all years"
                  note={viewingsFilmsNote(companion.company)}
                />
              </View>
              <View style={styles.statRow}>
                <MiniStat
                  label="Bucket list"
                  value={`${completion}%`}
                  icon="checkmark-done-outline"
                  tint={colors.primary}
                  hint={`${stats.bucketWatched}/${stats.bucketTotal} all years`}
                />
              </View>
              {companion.unanswered > 0 ? (
                <Text style={[styles.unansweredNote, { color: colors.textMuted }]}>
                  {companion.unanswered} {companion.unanswered === 1 ? 'viewing' : 'viewings'}{' '}
                  {companion.unanswered === 1 ? 'has' : 'have'} no answer yet.
                </Text>
              ) : null}
            </View>

            <Card style={styles.section}>
              <View style={styles.cardHeader}>
                <Text style={[styles.cardTitle, { color: colors.text }]}>Monthly activity</Text>
                <Text style={[styles.cardMeta, { color: colors.textDim }]}>{year}</Text>
              </View>
              <MonthChart
                compact
                counts={stats.monthlyCounts}
                labels={Array.from({ length: 12 }, (_, index) => monthShort(index))}
                selectedIndex={selectedMonth}
                onSelect={setSelectedMonth}
                accent={colors.accent}
              />
              <View style={[styles.detailRow, { borderTopColor: colors.borderSoft }]}>
                <Text style={[styles.detailText, { color: colors.textMuted }]}>
                  <Text style={[styles.detailValue, { color: colors.accent }]}>
                    {stats.monthlyCounts[selectedMonth]}
                  </Text>{' '}
                  {stats.monthlyCounts[selectedMonth] === 1 ? 'visit' : 'visits'} in{' '}
                  <Text style={{ color: colors.text, fontWeight: '700' }}>
                    {MONTH_NAMES[selectedMonth]}
                  </Text>
                  {monthlyPeak >= 2 ? `  ·  Peak: ${MONTH_NAMES[peakMonthIndex]} (${monthlyPeak})` : ''}
                </Text>
              </View>
            </Card>

            <Card style={styles.section}>
              <View style={styles.cardHeader}>
                <Text style={[styles.cardTitle, { color: colors.text }]}>Year by year</Text>
                <Text style={[styles.cardMeta, { color: colors.textDim }]}>visits</Text>
              </View>
              <BarList items={stats.yearOverYear} color={colors.primary} unit=" visits" />
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
  statGrid: {
    paddingHorizontal: 12,
    gap: 8,
    marginTop: 10,
    marginBottom: 10,
  },
  statRow: {
    flexDirection: 'row',
    gap: 8,
  },
  unansweredNote: {
    ...TYPE.small,
    paddingHorizontal: 4,
  },
  mini: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: '#1A2A42',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },
  miniIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniText: {
    flex: 1,
    minWidth: 0,
  },
  miniValue: {
    ...TYPE.number,
    fontSize: 24,
    lineHeight: 27,
    letterSpacing: -0.6,
  },
  miniLabel: {
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '700',
  },
  miniHint: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '500',
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
  detailRow: {
    marginTop: SPACE.sm,
    paddingTop: SPACE.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  detailText: {
    ...TYPE.small,
  },
  detailValue: {
    ...TYPE.heading,
    fontVariant: ['tabular-nums'],
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
