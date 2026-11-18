import React, { useMemo } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { SERIF, SPACE, TYPE, useTheme } from '../theme';
import { useLibrary } from '../hooks/useLibrary';
import type { ViewingEntry } from '../lib/library';
import { MONTH_NAMES, toDate } from '../lib/format';
import { theatreDisplay } from '../lib/theatres';
import { COMPANION_LABELS } from '../lib/stats';
import { AppHeader } from '../components/AppHeader';
import { EmptyState } from '../components/EmptyState';

interface MonthGroup {
  key: string;
  /** 0-based month. */
  month: number;
  entries: ViewingEntry[];
}

interface YearGroup {
  year: number;
  count: number;
  months: MonthGroup[];
}

const WEEKDAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

/**
 * The diary: every viewing, newest first. Each year is a heading, each month is one card, and
 * each viewing is a row in that card with its day on the left.
 */
export default function DiaryScreen() {
  const { colors } = useTheme();
  const { library, loading } = useLibrary();

  // Different films by name: the same film logged twice counts once.
  const uniqueTitles = useMemo(
    () => new Set(library.entries.map((entry) => entry.title.trim().toLowerCase())).size,
    [library.entries]
  );

  // Every year, newest first: each year holds its months, each month holds its viewings.
  const yearGroups = useMemo(() => {
    const sorted = [...library.entries].sort(
      (a, b) => toDate(b.watchedAt).getTime() - toDate(a.watchedAt).getTime()
    );
    const years: YearGroup[] = [];
    sorted.forEach((entry) => {
      const date = toDate(entry.watchedAt);
      const year = date.getFullYear();
      const month = date.getMonth();
      let yearGroup = years[years.length - 1];
      if (!yearGroup || yearGroup.year !== year) {
        yearGroup = { year, count: 0, months: [] };
        years.push(yearGroup);
      }
      yearGroup.count += 1;
      let monthGroup = yearGroup.months[yearGroup.months.length - 1];
      if (!monthGroup || monthGroup.month !== month) {
        monthGroup = { key: `${year}-${month}`, month, entries: [] };
        yearGroup.months.push(monthGroup);
      }
      monthGroup.entries.push(entry);
    });
    return years;
  }, [library.entries]);

  const hasEntries = library.entries.length > 0;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <AppHeader title="Diary" subtitle="Every film you have watched, by year." />

      {/* The page header and the summary stay put; only the years below scroll. */}
      {!loading && hasEntries ? (
        <View style={[styles.summary, { backgroundColor: colors.surface, borderColor: colors.borderSoft }]}>
          <SummaryStat label="Total movies" value={uniqueTitles} hint="Unique titles" />
        </View>
      ) : null}

      <ScrollView
        showsVerticalScrollIndicator={false}
        // Each year heading sticks to the top while its months scroll; the next year's heading replaces it.
        stickyHeaderIndices={hasEntries && !loading ? yearGroups.map((_, index) => index * 2) : undefined}
        contentContainerStyle={{
          paddingBottom: 36,
          width: '100%',
          maxWidth: 720,
          alignSelf: 'center',
          flexGrow: 1,
        }}
      >
        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.accent} />
          </View>
        ) : !hasEntries ? (
          <View style={styles.emptyWrap}>
            <EmptyState
              icon="book-outline"
              title="Your diary is empty"
              message="Log your first theatre visit and it will live here."
            />
          </View>
        ) : (
          yearGroups.flatMap((yearGroup) => [
            <View
              key={`year-${yearGroup.year}`}
              style={[styles.stickyYear, { backgroundColor: colors.background }]}
            >
              <View style={styles.yearHeader}>
                <Text style={[styles.yearTitle, { color: colors.text }]}>{yearGroup.year}</Text>
                <Text style={[styles.yearCount, { color: colors.textMuted }]}>
                  {yearGroup.count} {yearGroup.count === 1 ? 'visit' : 'visits'}
                </Text>
              </View>
              <View style={[styles.yearRule, { backgroundColor: colors.text }]} />
            </View>,
            <View key={`months-${yearGroup.year}`} style={styles.monthsWrap}>
                {yearGroup.months.map((monthGroup) => (
                  <View
                    key={monthGroup.key}
                    style={[styles.monthBlock, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  >
                    <Text style={[styles.monthName, { color: colors.textMuted }]}>
                      {MONTH_NAMES[monthGroup.month].toUpperCase()}
                    </Text>

                    {monthGroup.entries.map((entry, entryIndex) => {
                      const date = toDate(entry.watchedAt);
                      const rating = typeof entry.rating === 'number' ? entry.rating : 0;
                      const place = theatreDisplay(entry, library.theatres);
                      return (
                        <Pressable
                          key={entry.id}
                          style={({ pressed }) => [
                            styles.row,
                            entryIndex === monthGroup.entries.length - 1
                              ? { borderBottomWidth: 0 }
                              : { borderBottomColor: colors.border },
                            pressed && { backgroundColor: colors.accentSoft },
                          ]}
                          onPress={() =>
                            router.push({ pathname: '/viewing/[entryId]', params: { entryId: entry.id } })
                          }
                          accessible
                          accessibilityLabel={`Open ${entry.title}`}
                        >
                          <View style={styles.dayStub}>
                            <Text style={[styles.dayNumber, { color: colors.text }]}>
                              {date.getDate()}
                            </Text>
                            <Text style={[styles.weekday, { color: colors.textMuted }]}>
                              {WEEKDAYS[date.getDay()]}
                            </Text>
                          </View>

                          <View style={styles.body}>
                            <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
                              {entry.title}
                            </Text>
                            {place || rating > 0 ? (
                              <View style={styles.line}>
                                {place ? (
                                  <>
                                    <Ionicons name="location-outline" size={13} color={colors.textMuted} />
                                    <Text
                                      style={[styles.lineText, { color: colors.textMuted }]}
                                      numberOfLines={1}
                                    >
                                      {place.name}
                                    </Text>
                                  </>
                                ) : null}
                                {rating > 0 ? (
                                  <View style={styles.rating}>
                                    <Ionicons name="star" size={11} color={colors.star} />
                                    <Text style={[styles.ratingText, { color: colors.textMuted }]}>
                                      {rating.toFixed(1)}
                                    </Text>
                                  </View>
                                ) : null}
                              </View>
                            ) : null}
                            {entry.notes ? (
                              <Text style={[styles.notes, { color: colors.textDim }]} numberOfLines={1}>
                                {entry.notes}
                              </Text>
                            ) : null}
                          </View>

                          {entry.companion ? (
                            <Text style={[styles.companionText, { color: colors.accent }]}>
                              {COMPANION_LABELS[entry.companion]}
                            </Text>
                          ) : null}

                        </Pressable>
                      );
                    })}
                  </View>
                ))}
            </View>,
          ])
        )}
      </ScrollView>
    </View>
  );
}

function SummaryStat({
  label,
  value,
  hint,
}: {
  label: string;
  value: number;
  hint: string;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.stat} accessibilityLabel={`${label}: ${value}. ${hint}`}>
      <Text style={[styles.statLabel, { color: colors.textMuted }]} numberOfLines={1}>
        {label}
      </Text>
      <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
      <Text style={[styles.statHint, { color: colors.textMuted }]} numberOfLines={1}>
        {hint}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  loading: {
    paddingTop: SPACE.xxl,
    alignItems: 'center',
  },
  emptyWrap: {
    paddingHorizontal: 12,
    paddingTop: SPACE.sm,
  },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 12,
    marginTop: 10,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
  },
  summaryDivider: {
    width: StyleSheet.hairlineWidth * 2,
    height: 48,
  },
  stat: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  statLabel: {
    ...TYPE.eyebrow,
    fontSize: 9.5,
    letterSpacing: 0.8,
  },
  statValue: {
    fontFamily: SERIF,
    fontSize: 28,
    lineHeight: 32,
    fontWeight: '700',
    letterSpacing: -0.6,
    fontVariant: ['tabular-nums'],
  },
  statHint: {
    fontSize: 11.5,
    lineHeight: 14,
    fontWeight: '600',
  },
  stickyYear: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 2,
  },
  monthsWrap: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  yearHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 6,
    paddingHorizontal: 4,
  },
  yearTitle: {
    fontFamily: SERIF,
    fontSize: 26,
    lineHeight: 30,
    fontWeight: '700',
    letterSpacing: -0.6,
    fontVariant: ['tabular-nums'],
  },
  yearCount: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  yearRule: {
    height: 2,
    borderRadius: 1,
    marginHorizontal: 4,
  },
  monthBlock: {
    marginTop: 10,
    paddingHorizontal: 12,
    paddingBottom: 2,
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
  },
  monthName: {
    ...TYPE.eyebrow,
    fontSize: 11,
    letterSpacing: 1.4,
    paddingHorizontal: 2,
    paddingTop: 14,
    paddingBottom: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 4,
    paddingVertical: 11,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  dayStub: {
    width: 30,
    alignItems: 'center',
  },
  dayNumber: {
    fontFamily: SERIF,
    fontSize: 22,
    lineHeight: 25,
    fontWeight: '700',
    letterSpacing: -0.5,
    fontVariant: ['tabular-nums'],
  },
  weekday: {
    fontSize: 9.5,
    lineHeight: 12,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  body: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    flex: 1,
    minWidth: 0,
    fontSize: 15,
    lineHeight: 19,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  line: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 3,
  },
  lineText: {
    flexShrink: 1,
    fontSize: 12.5,
    lineHeight: 16,
    fontWeight: '500',
    opacity: 0.85,
  },
  rating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginLeft: 4,
  },
  ratingText: {
    fontSize: 12.5,
    lineHeight: 16,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  companionText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  notes: {
    fontSize: 11.5,
    lineHeight: 15,
    fontStyle: 'italic',
    marginTop: 2,
  },
});
