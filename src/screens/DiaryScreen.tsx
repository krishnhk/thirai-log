import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { RADIUS, NUMBER_FONT, SPACE, TYPE, useTheme } from '../theme';
import { useLibrary } from '../hooks/useLibrary';
import { resolvePoster, type ViewingEntry } from '../lib/library';
import { MONTH_NAMES, toDate } from '../lib/format';
import { theatreDisplay } from '../lib/theatres';
import { COMPANION_LABELS } from '../lib/stats';
import { AppHeader } from '../components/AppHeader';
import { EmptyState } from '../components/EmptyState';
import { Poster } from '../components/Poster';
import { YearStrip } from '../components/YearStrip';

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
  // The screen ends where the tab bar begins, so the button sits just 16px above the bar.
  const fabBottom = 16;

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

  // One year at a time, with a stepper to move between years. It opens on the latest year with viewings.
  const currentYear = new Date().getFullYear();
  const newestYear = yearGroups[0]?.year ?? currentYear;
  const oldestYear = Math.min(yearGroups[yearGroups.length - 1]?.year ?? currentYear, newestYear);
  const upperYear = Math.max(newestYear, currentYear);
  const [pickedYear, setPickedYear] = useState<number | null>(null);
  const openYear = Math.min(Math.max(pickedYear ?? newestYear, oldestYear), upperYear);
  const openGroup = yearGroups.find((group) => group.year === openYear);
  const changeYear = (year: number) => {
    lastScrollY = 0;
    scrollRef.current?.scrollTo({ y: 0, animated: false });
    setPickedYear(year);
  };

  // Coming back to the Diary (after editing a viewing, for example) can leave the list at the top, because
  // Android resets the scroll offset of a tab that was hidden. So the screen remembers where the list was
  // scrolled to and puts it back every time it is shown again: bottom stays bottom, middle stays middle.
  const scrollRef = useRef<React.ComponentRef<typeof ScrollView>>(null);
  // True while the position is being put back, so the reset to the top is not remembered as the new position.
  const restoring = useRef(lastScrollY > 0);
  const putBack = useCallback(() => {
    scrollRef.current?.scrollTo({ y: lastScrollY, animated: false });
  }, []);
  useFocusEffect(
    useCallback(() => {
      if (lastScrollY <= 0) return undefined;
      restoring.current = true;
      // A few tries, because the list may not be laid out again at the first moment.
      const timers = [30, 150, 350].map((delay) => setTimeout(putBack, delay));
      timers.push(
        setTimeout(() => {
          restoring.current = false;
        }, 700)
      );
      return () => timers.forEach(clearTimeout);
    }, [putBack])
  );

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!restoring.current) lastScrollY = event.nativeEvent.contentOffset.y;
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <AppHeader title="Diary" subtitle="Every film you have watched, by year." />

      {/* The page header stays put; only the years below scroll. */}
      {hasEntries ? (
        <YearStrip
          label="VISITS"
          value={openGroup?.count ?? 0}
          year={openYear}
          canPrev={openYear > oldestYear}
          canNext={openYear < upperYear}
          onPrev={() => changeYear(openYear - 1)}
          onNext={() => changeYear(openYear + 1)}
          accessibilityLabel={`${openGroup?.count ?? 0} visits in ${openYear}`}
        />
      ) : null}
      <View style={styles.listWrap}>
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => {
          if (restoring.current) putBack();
        }}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{
          // Clears the Log button and the floating tab bar so the last card can scroll fully into view.
          paddingBottom: fabBottom + 56 + 20,
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
          [
            <View key="months" style={styles.monthsWrap}>
              {!openGroup ? (
                <View style={styles.noYear}>
                  <Text style={[styles.noYearText, { color: colors.textMuted }]}>
                    No films logged in {openYear}.
                  </Text>
                </View>
              ) : null}
                {(openGroup?.months ?? []).map((monthGroup) => (
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
                                color={colors.iconSoft}
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
          ]
        )}
      </ScrollView>

      </View>

      <Pressable
        onPress={() => router.navigate('/log')}
        accessibilityRole="button"
        accessibilityLabel="Log a viewing"
        style={({ pressed }) => [
          styles.fab,
          {
            bottom: fabBottom,
            backgroundColor: colors.accent,
            shadowColor: colors.accent,
          },
          pressed && { opacity: 0.85, transform: [{ scale: 0.95 }] },
        ]}
      >
        <Ionicons name="add" size={28} color={colors.onAccent} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  // Inset 24 from the edge, so it sits inside the month cards' edge (they have 12 of margin) instead of hugging the screen.
  fab: {
    position: 'absolute',
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 8,
    zIndex: 10,
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
  headerLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 8,
  },
  countText: { fontSize: 14, fontWeight: '800', fontVariant: ['tabular-nums'] },
  yearStepper: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  yearArrow: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  yearNavText: { minWidth: 48, fontSize: 16, fontWeight: '800', textAlign: 'center', fontVariant: ['tabular-nums'] },
  noYear: { paddingVertical: SPACE.xl, alignItems: 'center' },
  noYearText: { fontSize: 14, fontWeight: '600' },
  monthsWrap: {
    paddingHorizontal: 16,
    paddingBottom: 8,
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
    fontFamily: NUMBER_FONT,
    fontSize: 22,
    lineHeight: 29,
    fontWeight: '400',
    letterSpacing: 0,
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
