import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TAB_BAR_HEIGHT, SPACE, RADIUS, TYPE, useTheme } from '../theme';
import { useLibrary } from '../hooks/useLibrary';
import { resolvePoster, type AnnualList, type ViewingEntry } from '../lib/library';
import { formatShortDate, monthShort, MONTH_NAMES, toDate, yearOf } from '../lib/format';
import { BrandMark } from '../components/BrandMark';
import { Card } from '../components/Card';
import { StatCard } from '../components/StatCard';
import { SectionHeader } from '../components/SectionHeader';
import { EmptyState } from '../components/EmptyState';
import { MonthChart } from '../components/MonthChart';
import { PosterCard } from '../components/PosterCard';
import { ActionButton } from '../components/ActionButton';

export default function HomeScreen() {
  const { colors, mode, toggle } = useTheme();
  const insets = useSafeAreaInsets();
  const { library, loading } = useLibrary();
  const year = new Date().getFullYear();
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());

  const derived = useMemo(() => {
    const entriesThisYear = library.entries.filter(
      (entry) => yearOf(entry.watchedAt) === year
    );

    const uniqueThisYear = new Set(entriesThisYear.map((entry) => entry.movieId)).size;
    const theatreVisits = entriesThisYear.length;

    const currentList: AnnualList | undefined = library.annual.find(
      (list) => list.year === year
    );
    const bucketTotal = currentList?.movies.length ?? 0;
    const bucketWatched =
      currentList?.movies.filter((movie) => movie.status === 'watched').length ?? 0;

    const monthlyCounts = Array.from({ length: 12 }, () => 0);
    entriesThisYear.forEach((entry) => {
      monthlyCounts[toDate(entry.watchedAt).getMonth()] += 1;
    });

    const seen = new Set<string>();
    const recent: ViewingEntry[] = [];
    [...library.entries]
      .sort((a, b) => toDate(b.watchedAt).getTime() - toDate(a.watchedAt).getTime())
      .forEach((entry) => {
        if (seen.has(entry.movieId)) return;
        seen.add(entry.movieId);
        recent.push(entry);
      });

    const plannedFromLists = library.annual
      .filter((list) => list.year === year)
      .flatMap((list) => list.movies)
      .filter((movie) => movie.status === 'planned');
    const plannedFromWatchlist = library.watchlist.filter(
      (movie) => movie.status === 'planned'
    );

    return {
      uniqueThisYear,
      theatreVisits,
      bucketTotal,
      bucketWatched,
      monthlyCounts,
      recent: recent.slice(0, 10),
      planned: [...plannedFromLists, ...plannedFromWatchlist].slice(0, 10),
    };
  }, [library, year]);

  const progressPct =
    derived.bucketTotal > 0
      ? Math.round((derived.bucketWatched / derived.bucketTotal) * 100)
      : 0;
  const selectedCount = derived.monthlyCounts[selectedMonth] ?? 0;
  const hasMonthlyActivity = derived.monthlyCounts.some((count) => count > 0);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: insets.bottom + TAB_BAR_HEIGHT + SPACE.xxl,
          width: '100%',
          maxWidth: 720,
          alignSelf: 'center',
        }}
      >
        <View style={[styles.header, { paddingTop: insets.top + SPACE.md }]}>
          <View style={styles.brandRow}>
            <BrandMark />
            <View style={styles.headerActions}>
              <IconButton
                icon="settings-outline"
                label="Settings"
                onPress={() => router.push('/settings')}
              />
              <IconButton
                icon={mode === 'dark' ? 'sunny-outline' : 'moon-outline'}
                label="Toggle theme"
                onPress={toggle}
              />
            </View>
          </View>

          <Text style={[styles.greeting, { color: colors.text }]}>Your {year}</Text>
          <Text style={[styles.greetingSub, { color: colors.textMuted }]}>
            A private diary of the films that stayed with you.
          </Text>
        </View>

        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.accent} />
          </View>
        ) : (
          <>
            <Card style={styles.hero}>
              <Text style={[styles.heroLabel, { color: colors.textMuted }]}>Theatre visits</Text>
              <View style={styles.heroRow}>
                <Text style={[styles.heroNumber, { color: colors.text }]}>
                  {derived.theatreVisits}
                </Text>
                <Text style={[styles.heroUnit, { color: colors.textDim }]}>
                  {derived.theatreVisits === 1 ? 'visit' : 'visits'} this year
                </Text>
              </View>

              {derived.bucketTotal > 0 ? (
                <View style={styles.progressBlock}>
                  <View style={styles.progressHead}>
                    <Text style={[styles.progressTitle, { color: colors.text }]}>
                      {year} bucket list
                    </Text>
                    <Text style={[styles.progressCount, { color: colors.gold }]}>
                      {derived.bucketWatched}/{derived.bucketTotal}
                    </Text>
                  </View>
                  <View style={[styles.progressTrack, { backgroundColor: colors.surfaceAlt }]}>
                    <View
                      style={[
                        styles.progressFill,
                        { width: `${Math.min(100, progressPct)}%`, backgroundColor: colors.gold },
                      ]}
                    />
                  </View>
                  <Text style={[styles.progressCaption, { color: colors.textMuted }]}>
                    {progressPct}% watched
                  </Text>
                </View>
              ) : (
                <Pressable
                  onPress={() => router.navigate('/watchlist')}
                  style={[styles.buildRow, { borderColor: colors.borderSoft }]}
                >
                  <Ionicons name="sparkles-outline" size={18} color={colors.accent} />
                  <Text style={[styles.buildText, { color: colors.text }]}>
                    Build your {year} bucket list
                  </Text>
                  <Ionicons name="chevron-forward" size={18} color={colors.textDim} />
                </Pressable>
              )}

              <View style={styles.heroAction}>
                <ActionButton
                  label="Log a film"
                  icon="add"
                  onPress={() => router.navigate('/log')}
                  fullWidth
                />
                <ActionButton
                  label="Film database"
                  icon="film-outline"
                  variant="outline"
                  onPress={() => router.push('/films')}
                  fullWidth
                  style={styles.secondaryAction}
                />
              </View>
            </Card>

            <View style={styles.statRow}>
              <StatCard
                label="Films this year"
                value={derived.uniqueThisYear}
                icon="film-outline"
                tint={colors.accent}
                hint="unique titles"
              />
              <StatCard
                label="Bucket list"
                value={derived.bucketTotal}
                icon="bookmark-outline"
                tint={colors.gold}
                hint={`${derived.bucketWatched} watched`}
              />
            </View>

            <Card style={styles.section}>
              <View style={styles.cardHeader}>
                <Text style={[styles.cardTitle, { color: colors.text }]}>Monthly activity</Text>
                <Text style={[styles.cardMeta, { color: colors.textDim }]}>{year}</Text>
              </View>
              <MonthChart
                counts={derived.monthlyCounts}
                labels={Array.from({ length: 12 }, (_, index) => monthShort(index))}
                selectedIndex={selectedMonth}
                onSelect={setSelectedMonth}
                accent={colors.accent}
              />
              <View style={[styles.monthDetail, { borderTopColor: colors.borderSoft }]}>
                {hasMonthlyActivity ? (
                  <Text style={[styles.monthDetailText, { color: colors.textMuted }]}>
                    <Text style={[styles.monthDetailValue, { color: colors.accent }]}>
                      {selectedCount}
                    </Text>{' '}
                    {selectedCount === 1 ? 'visit' : 'visits'} in{' '}
                    <Text style={{ color: colors.text, fontWeight: '700' }}>
                      {MONTH_NAMES[selectedMonth]}
                    </Text>
                  </Text>
                ) : (
                  <Text style={[styles.monthDetailText, { color: colors.textMuted }]}>
                    No theatre visits logged yet this year. Your first memory is waiting.
                  </Text>
                )}
              </View>
            </Card>

            <SectionHeader
              title="Recently watched"
              subtitle="Your latest theatre memories"
              actionLabel="Diary"
              onAction={() => router.navigate('/diary')}
            />
            {derived.recent.length === 0 ? (
              <View style={styles.sectionPad}>
                <EmptyState
                  icon="film-outline"
                  title="No films logged yet"
                  message="Your recent theatre memories will appear here once you log a movie."
                  actionLabel="Log your first movie"
                  onAction={() => router.navigate('/log')}
                  compact
                />
              </View>
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.carousel}
              >
                {derived.recent.map((entry) => (
                  <PosterCard
                    key={entry.id}
                    title={entry.title}
                    posterPath={resolvePoster(library, entry.movieId, entry.title)}
                    rating={entry.rating}
                    meta={formatShortDate(entry.watchedAt)}
                    width={124}
                    onPress={() => router.navigate('/diary')}
                  />
                ))}
              </ScrollView>
            )}

            <SectionHeader
              title="Up next"
              subtitle={`${year} bucket list`}
              actionLabel="Watchlist"
              onAction={() => router.navigate('/watchlist')}
            />
            {derived.planned.length === 0 ? (
              <View style={styles.sectionPad}>
                <EmptyState
                  icon="bookmark-outline"
                  title="Nothing planned yet"
                  message="Add films to your annual bucket list and they will show up here."
                  actionLabel="Open watchlist"
                  onAction={() => router.navigate('/watchlist')}
                  compact
                />
              </View>
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.carousel}
              >
                {derived.planned.map((movie) => (
                  <PosterCard
                    key={movie.id}
                    title={movie.title}
                    posterPath={resolvePoster(library, movie.movieId, movie.title)}
                    status={movie.status}
                    meta={`${movie.year || year}`}
                    width={124}
                    onPress={() => router.navigate('/watchlist')}
                  />
                ))}
              </ScrollView>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function IconButton({
  icon,
  label,
  onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[
        styles.iconButton,
        { backgroundColor: colors.surfaceAlt, borderColor: colors.borderSoft },
      ]}
    >
      <Ionicons name={icon} size={18} color={colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    paddingHorizontal: SPACE.xl,
    paddingBottom: SPACE.lg,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.sm,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  greeting: {
    ...TYPE.display,
    marginTop: SPACE.xl,
  },
  greetingSub: {
    ...TYPE.small,
    marginTop: 6,
    maxWidth: 320,
  },
  loading: {
    paddingTop: SPACE.xxxl,
    alignItems: 'center',
  },
  hero: {
    marginHorizontal: SPACE.xl,
    marginBottom: SPACE.md,
  },
  heroLabel: {
    ...TYPE.eyebrow,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: SPACE.sm,
    marginTop: SPACE.xs,
  },
  heroNumber: {
    fontSize: 56,
    fontWeight: '800',
    letterSpacing: -2,
    fontVariant: ['tabular-nums'],
  },
  heroUnit: {
    ...TYPE.body,
  },
  progressBlock: {
    marginTop: SPACE.lg,
  },
  progressHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACE.sm,
  },
  progressTitle: {
    ...TYPE.small,
    fontWeight: '700',
  },
  progressCount: {
    ...TYPE.small,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  progressTrack: {
    height: 8,
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
  },
  progressCaption: {
    ...TYPE.caption,
    marginTop: SPACE.sm,
  },
  buildRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.md,
    marginTop: SPACE.lg,
    paddingTop: SPACE.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  buildText: {
    ...TYPE.small,
    fontWeight: '700',
    flex: 1,
  },
  secondaryAction: {
    marginTop: SPACE.sm,
  },
  heroAction: {
    marginTop: SPACE.lg,
  },
  statRow: {
    flexDirection: 'row',
    gap: SPACE.sm,
    paddingHorizontal: SPACE.xl,
    marginBottom: SPACE.md,
  },
  section: {
    marginHorizontal: SPACE.xl,
    marginBottom: SPACE.xl,
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
  monthDetail: {
    marginTop: SPACE.md,
    paddingTop: SPACE.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  monthDetailText: {
    ...TYPE.small,
  },
  monthDetailValue: {
    ...TYPE.heading,
    fontVariant: ['tabular-nums'],
  },
  sectionPad: {
    paddingHorizontal: SPACE.xl,
    marginBottom: SPACE.xl,
  },
  carousel: {
    paddingHorizontal: SPACE.xl,
    paddingBottom: SPACE.sm,
    marginBottom: SPACE.xl,
  },
});
