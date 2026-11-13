import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SPACE, RADIUS, TYPE, useTheme } from '../theme';
import { useLibrary } from '../hooks/useLibrary';
import { resolvePoster, type ViewingEntry } from '../lib/library';
import { formatDate, monthShort, MONTH_NAMES, toDate } from '../lib/format';
import { ScreenHeader } from '../components/ScreenHeader';
import { Card } from '../components/Card';
import { StatCard } from '../components/StatCard';
import { EmptyState } from '../components/EmptyState';
import { MonthChart } from '../components/MonthChart';
import { BarList } from '../components/BarList';
import { Poster } from '../components/Poster';
import { RatingStars } from '../components/RatingStars';

export default function StatisticsScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { library, loading } = useLibrary();
  const year = new Date().getFullYear();
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());

  const stats = useMemo(() => {
    const entries = library.entries;
    const uniqueMap = new Map<string, ViewingEntry>();
    entries.forEach((entry) => {
      if (!uniqueMap.has(entry.movieId)) uniqueMap.set(entry.movieId, entry);
    });

    const rated = entries.filter((entry) => typeof entry.rating === 'number');
    const average =
      rated.length > 0
        ? rated.reduce((sum, entry) => sum + (entry.rating ?? 0), 0) / rated.length
        : 0;

    const currentList = library.annual.find((list) => list.year === year);
    const bucketTotal = currentList?.movies.length ?? 0;
    const bucketWatched =
      currentList?.movies.filter((movie) => movie.status === 'watched').length ?? 0;

    const monthlyCounts = Array.from({ length: 12 }, () => 0);
    const yearlyCounts: Record<number, number> = {};
    entries.forEach((entry) => {
      const date = toDate(entry.watchedAt);
      yearlyCounts[date.getFullYear()] = (yearlyCounts[date.getFullYear()] ?? 0) + 1;
      if (date.getFullYear() === year) {
        monthlyCounts[date.getMonth()] += 1;
      }
    });

    // Genres and languages come from the film catalog (filled when a film is chosen).
    const movieMap = new Map(library.movies.map((movie) => [movie.id, movie]));
    const genreCounts: Record<string, number> = {};
    const languageCounts: Record<string, number> = {};

    uniqueMap.forEach((entry, movieId) => {
      const movie =
        movieMap.get(movieId) ??
        library.movies.find((item) => item.title.toLowerCase() === entry.title.toLowerCase());

      (movie?.genres ?? []).forEach((genre) => {
        genreCounts[genre] = (genreCounts[genre] ?? 0) + 1;
      });

      const language = movie?.languages?.[0];
      if (language) {
        languageCounts[language] = (languageCounts[language] ?? 0) + 1;
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
      average,
      bucketTotal,
      bucketWatched,
      monthlyCounts,
      genres: Object.entries(genreCounts)
        .map(([label, value]) => ({ label, value }))
        .sort((a, b) => b.value - a.value),
      languages: Object.entries(languageCounts)
        .map(([label, value]) => ({ label, value }))
        .sort((a, b) => b.value - a.value),
      yearOverYear: Object.entries(yearlyCounts)
        .map(([label, value]) => ({ label, value }))
        .sort((a, b) => Number(a.label) - Number(b.label)),
      topRated: topRated.slice(0, 5),
    };
  }, [library, year]);

  const completion =
    stats.bucketTotal > 0 ? Math.round((stats.bucketWatched / stats.bucketTotal) * 100) : 0;
  const monthlyPeak = Math.max(...stats.monthlyCounts);
  const peakMonthIndex = stats.monthlyCounts.indexOf(monthlyPeak);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: insets.bottom + SPACE.xxl,
          width: '100%',
          maxWidth: 720,
          alignSelf: 'center',
        }}
      >
        <ScreenHeader eyebrow="Insights" title="Statistics" subtitle="The shape of your cinema habit." />

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
                <StatCard label="Films logged" value={stats.films} icon="film-outline" tint={colors.accent} hint="all time" />
                <StatCard label="Theatre visits" value={stats.visits} icon="ticket-outline" tint={colors.teal} hint="all time" />
              </View>
              <View style={styles.statRow}>
                <StatCard
                  label="Average rating"
                  value={stats.average > 0 ? stats.average.toFixed(1) : '—'}
                  icon="star-outline"
                  tint={colors.star}
                  hint={stats.average > 0 ? 'out of 5' : 'not rated'}
                />
                <StatCard
                  label="Bucket list"
                  value={`${completion}%`}
                  icon="checkmark-done-outline"
                  tint={colors.gold}
                  hint={`${stats.bucketWatched}/${stats.bucketTotal} this year`}
                />
              </View>
            </View>

            <Card style={styles.section}>
              <View style={styles.cardHeader}>
                <Text style={[styles.cardTitle, { color: colors.text }]}>Monthly activity</Text>
                <Text style={[styles.cardMeta, { color: colors.textDim }]}>{year}</Text>
              </View>
              <MonthChart
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
                <Text style={[styles.cardTitle, { color: colors.text }]}>Genres</Text>
                <Ionicons name="pricetags-outline" size={17} color={colors.rose} />
              </View>
              {stats.genres.length > 0 ? (
                <BarList items={stats.genres} color={colors.rose} showPercent />
              ) : (
                <Text style={[styles.mutedNote, { color: colors.textMuted }]}>
                  Genre insights appear once your logged films carry metadata. Keep logging from your
                  saved library and this will fill in.
                </Text>
              )}
            </Card>

            <Card style={styles.section}>
              <View style={styles.cardHeader}>
                <Text style={[styles.cardTitle, { color: colors.text }]}>Languages</Text>
                <Ionicons name="language-outline" size={17} color={colors.blue} />
              </View>
              {stats.languages.length > 0 ? (
                <BarList items={stats.languages} color={colors.blue} showPercent />
              ) : (
                <Text style={[styles.mutedNote, { color: colors.textMuted }]}>
                  Language insights appear once your logged films carry metadata.
                </Text>
              )}
            </Card>

            <Card style={styles.section}>
              <View style={styles.cardHeader}>
                <Text style={[styles.cardTitle, { color: colors.text }]}>Year by year</Text>
                <Text style={[styles.cardMeta, { color: colors.textDim }]}>visits</Text>
              </View>
              <BarList items={stats.yearOverYear} color={colors.teal} unit=" visits" />
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
                      width={42}
                      radius={RADIUS.sm}
                    />
                    <View style={styles.favText}>
                      <Text style={[styles.favTitle, { color: colors.text }]} numberOfLines={1}>
                        {entry.title}
                      </Text>
                      <Text style={[styles.favMeta, { color: colors.textDim }]}>
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
    paddingHorizontal: SPACE.xl,
  },
  statGrid: {
    paddingHorizontal: SPACE.xl,
    gap: SPACE.sm,
    marginBottom: SPACE.md,
  },
  statRow: {
    flexDirection: 'row',
    gap: SPACE.sm,
  },
  section: {
    marginHorizontal: SPACE.xl,
    marginBottom: SPACE.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACE.md,
  },
  cardTitle: {
    ...TYPE.heading,
    fontSize: 15,
  },
  cardMeta: {
    ...TYPE.eyebrow,
    fontSize: 10,
  },
  detailRow: {
    marginTop: SPACE.md,
    paddingTop: SPACE.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  detailText: {
    ...TYPE.small,
  },
  detailValue: {
    ...TYPE.heading,
    fontVariant: ['tabular-nums'],
  },
  mutedNote: {
    ...TYPE.small,
    lineHeight: 19,
  },
  favRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.md,
    padding: SPACE.md,
    borderRadius: RADIUS.lg,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: SPACE.sm,
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
