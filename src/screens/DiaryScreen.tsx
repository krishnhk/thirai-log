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

  const currentYear = new Date().getFullYear();
  const totals = useMemo(
    () => ({
      // Different films by name: the same film logged twice counts once.
      movies: new Set(library.entries.map((entry) => entry.title.trim().toLowerCase())).size,
      thisYear: new Set(
        library.entries
          .filter((entry) => toDate(entry.watchedAt).getFullYear() === currentYear)
          .map((entry) => entry.title.trim().toLowerCase())
      ).size,
    }),
    [library.entries, currentYear]
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
      <AppHeader />

      <ScrollView
        showsVerticalScrollIndicator={false}
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
          <>
            {/* One summary card, two equal halves. */}
            <View
              style={[
                styles.summary,
                { backgroundColor: colors.surface, borderColor: colors.borderSoft },
              ]}
            >
              <SummaryStat
                label="Total movies"
                value={totals.movies}
                hint="Unique titles"
              />
              <View style={[styles.summaryDivider, { backgroundColor: colors.borderSoft }]} />
              <SummaryStat
                label="Movies this year"
                value={totals.thisYear}
                hint={`Unique in ${currentYear}`}
              />
            </View>

            {yearGroups.map((yearGroup) => (
              <View key={yearGroup.year} style={styles.yearBlock}>
                <View style={styles.yearHeader}>
                  <Text style={[styles.yearTitle, { color: colors.text }]}>{yearGroup.year}</Text>
                  <View style={[styles.yearLine, { backgroundColor: colors.border }]} />
                  <Text style={[styles.yearCount, { color: colors.textMuted }]}>
                    {yearGroup.count} {yearGroup.count === 1 ? 'visit' : 'visits'}
                  </Text>
                </View>

                {yearGroup.months.map((monthGroup) => (
                  <View
                    key={monthGroup.key}
                    style={[
                      styles.monthCard,
                      { backgroundColor: colors.surface, borderColor: colors.borderSoft },
                    ]}
                  >
                    <View style={styles.monthHead}>
                      <View style={[styles.monthTick, { backgroundColor: colors.gold }]} />
                      <Text style={[styles.monthName, { color: colors.coralInk }]}>
                        {MONTH_NAMES[monthGroup.month].toUpperCase()}
                      </Text>
                      <Text style={[styles.monthCount, { color: colors.textMuted }]}>
                        {monthGroup.entries.length}{' '}
                        {monthGroup.entries.length === 1 ? 'visit' : 'visits'}
                      </Text>
                    </View>

                    {monthGroup.entries.map((entry) => {
                      const date = toDate(entry.watchedAt);
                      const rating = typeof entry.rating === 'number' ? entry.rating : 0;
                      const place = theatreDisplay(entry, library.theatres);
                      return (
                        <Pressable
                          key={entry.id}
                          style={({ pressed }) => [
                            styles.row,
                            { borderTopColor: colors.borderSoft },
                            pressed && { backgroundColor: colors.accentSoft },
                          ]}
                          onPress={() =>
                            router.push({ pathname: '/viewing/[entryId]', params: { entryId: entry.id } })
                          }
                          // No button role here: the Edit control below is a nested button.
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
                            <View style={styles.titleRow}>
                              <Text
                                style={[styles.title, { color: colors.text }]}
                                numberOfLines={2}
                              >
                                {entry.title}
                              </Text>
                              {entry.companion ? (
                                <View style={[styles.companionTag, { backgroundColor: colors.coralSoft }]}>
                                  <Text style={[styles.companionTagText, { color: colors.coralInk }]}>
                                    {COMPANION_LABELS[entry.companion]}
                                  </Text>
                                </View>
                              ) : null}
                            </View>
                            {place || rating > 0 ? (
                              <View style={styles.line}>
                                {place ? (
                                  <>
                                    <Ionicons name="location-outline" size={13} color={colors.textMuted} />
                                    <Text
                                      style={[styles.lineText, { color: colors.text }]}
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

                          <Pressable
                            hitSlop={8}
                            onPress={() =>
                              router.navigate({
                                pathname: '/log',
                                params: { editEntryId: entry.id, from: 'diary' },
                              })
                            }
                            accessibilityRole="button"
                            accessibilityLabel={`Edit ${entry.title}`}
                            style={({ pressed }) => [
                              styles.editBadge,
                              { backgroundColor: colors.surfaceAlt },
                              pressed && { opacity: 0.6 },
                            ]}
                          >
                            <Ionicons name="pencil" size={14} color={colors.coralInk} />
                          </Pressable>
                        </Pressable>
                      );
                    })}
                  </View>
                ))}
              </View>
            ))}
          </>
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
  yearBlock: {
    paddingHorizontal: 12,
    marginTop: 16,
  },
  yearHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
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
  yearLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth * 2,
  },
  yearCount: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  monthCard: {
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 10,
    overflow: 'hidden',
    shadowColor: '#142A45',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },
  monthHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 8,
  },
  monthTick: {
    width: 3,
    height: 14,
    borderRadius: 2,
  },
  monthName: {
    flex: 1,
    ...TYPE.eyebrow,
    fontSize: 11.5,
    letterSpacing: 1.2,
  },
  monthCount: {
    fontSize: 12,
    fontWeight: '700',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
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
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  companionTag: {
    flexShrink: 0,
    marginTop: 1,
    paddingHorizontal: 8,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  companionTagText: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  notes: {
    fontSize: 11.5,
    lineHeight: 15,
    fontStyle: 'italic',
    marginTop: 2,
  },
  editBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
