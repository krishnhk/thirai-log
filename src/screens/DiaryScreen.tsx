import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import { RADIUS, SERIF, SPACE, TYPE, useTheme } from '../theme';
import { useLibrary } from '../hooks/useLibrary';
import { resolvePoster, type ViewingEntry } from '../lib/library';
import { MONTH_NAMES, toDate } from '../lib/format';
import { theatreDisplay } from '../lib/theatres';
import { COMPANION_LABELS } from '../lib/stats';
import { AppHeader } from '../components/AppHeader';
import { EmptyState } from '../components/EmptyState';
import { Poster } from '../components/Poster';

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

// Where the list was scrolled to. Kept outside the screen so it survives the screen being rebuilt after a save.
let lastScrollY = 0;

const WEEKDAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

/**
 * The diary: every viewing, newest first. Each year is a heading, each month is one card, and
 * each viewing is a row in that card with its day on the left.
 */
export default function DiaryScreen() {
  const { colors } = useTheme();
  const { library, loading } = useLibrary();

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

  // The year bar pinned under the summary. It is drawn over the list (not a native sticky header), so
  // it always sits flush under the summary and rows never show in a gap above it. It appears once the
  // first year heading has scrolled away and switches year as each next heading reaches the top.
  const [pinnedYear, setPinnedYear] = useState<number | null>(null);
  const yearTops = useRef<Record<number, number>>({});

  // After a save the Diary can come back at the top. Remember the scroll position and put the list back
  // where it was once its content is laid out again.
  const scrollRef = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const restoreScroll = useRef(lastScrollY > 0);
  useFocusEffect(
    useCallback(() => {
      restoreScroll.current = lastScrollY > 0;
      const timer = setTimeout(() => {
        restoreScroll.current = false;
      }, 2000);
      return () => clearTimeout(timer);
    }, [])
  );

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = event.nativeEvent.contentOffset.y;
    lastScrollY = y;
    let current: number | null = null;
    if (yearGroups.length > 0 && y > (yearTops.current[yearGroups[0].year] ?? 0) + 1) {
      yearGroups.forEach((group) => {
        const top = yearTops.current[group.year];
        if (top !== undefined && top <= y + 1) current = group.year;
      });
    }
    setPinnedYear((previous) => (previous === current ? previous : current));
  };
  const pinned = yearGroups.find((group) => group.year === pinnedYear);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <AppHeader title="Diary" subtitle="Every film you have watched, by year." />

      {/* The page header stays put; only the years below scroll. */}
      <View style={styles.listWrap}>
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={(_width, height) => {
          if (restoreScroll.current && height >= lastScrollY + 1) {
            scrollRef.current?.scrollTo({ y: lastScrollY, animated: false });
            restoreScroll.current = false;
          }
        }}
        onScroll={handleScroll}
        scrollEventThrottle={16}
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
              onLayout={(event: LayoutChangeEvent) => {
                yearTops.current[yearGroup.year] = event.nativeEvent.layout.y;
              }}
            >
              <YearHeading year={yearGroup.year} count={yearGroup.count} />
            </View>,
            <View key={`months-${yearGroup.year}`} style={styles.monthsWrap}>
                {yearGroup.months.map((monthGroup) => (
                  <View key={monthGroup.key} style={styles.monthShadow}>
                  <View style={[styles.monthBlock, { backgroundColor: colors.surface, borderColor: colors.border }]}>
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

                          <Poster
                            uri={resolvePoster(library, entry.movieId, entry.title)}
                            title={entry.title}
                            width={42}
                            radius={RADIUS.sm}
                          />

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
                            <View accessible accessibilityLabel={COMPANION_LABELS[entry.companion]}>
                              <Ionicons
                                name={entry.companion === 'alone' ? 'person' : 'people'}
                                size={19}
                                color={colors.accent}
                              />
                            </View>
                          ) : null}

                        </Pressable>
                      );
                    })}
                  </View>
                  </View>
                ))}
            </View>,
          ])
        )}
      </ScrollView>

      {pinned ? (
        <View style={[styles.pinnedYear, { backgroundColor: colors.background }]} pointerEvents="none">
          <View style={styles.pinnedInner}>
            <YearHeading year={pinned.year} count={pinned.count} />
          </View>
          {/* Rows dissolve softly under the pinned heading instead of being cut off at its line. */}
          <LinearGradient
            colors={[colors.background, `${colors.background}00`]}
            style={styles.yearFade}
            pointerEvents="none"
          />
        </View>
      ) : null}
      </View>
    </View>
  );
}

/** The year, its visit count and the dark rule under them. Used in the list and in the pinned bar. */
function YearHeading({ year, count }: { year: number; count: number }) {
  const { colors } = useTheme();
  return (
    <>
      <View style={styles.yearHeader}>
        <Text style={[styles.yearTitle, { color: colors.text }]}>{year}</Text>
        <Text style={[styles.yearCount, { color: colors.textMuted }]}>
          {count} {count === 1 ? 'visit' : 'visits'}
        </Text>
      </View>
      <View style={[styles.yearRule, { backgroundColor: colors.text }]} />
    </>
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
  listWrap: {
    flex: 1,
  },
  pinnedYear: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 2,
    zIndex: 5,
  },
  pinnedInner: {
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
  },
  stickyYear: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 2,
  },
  yearFade: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '100%',
    height: 18,
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
  monthShadow: {
    marginTop: 10,
    borderRadius: 18,
    shadowColor: '#1A2A42',
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 4,
  },
  monthBlock: {
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
    minWidth: 0,
    fontSize: 15,
    lineHeight: 19,
    fontWeight: '800',
    letterSpacing: -0.2,
    // Android adds extra space above and below text by default, which widens the gap to the line below.
    includeFontPadding: false,
  },
  line: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  lineText: {
    flexShrink: 1,
    fontSize: 12.5,
    lineHeight: 16,
    includeFontPadding: false,
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
  notes: {
    fontSize: 11.5,
    lineHeight: 15,
    fontStyle: 'italic',
    marginTop: 2,
  },
});
