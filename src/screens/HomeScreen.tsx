import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RADIUS, SERIF, SPACE, TYPE, useTheme } from '../theme';
import { useLibrary } from '../hooks/useLibrary';
import type { AnnualList } from '../lib/library';
import { MONTH_NAMES, monthShort, toDate, yearOf } from '../lib/format';
import { companionStats } from '../lib/stats';
import { BrandMark } from '../components/BrandMark';
import { MonthTrend } from '../components/MonthTrend';
import { ProgressRing } from '../components/ProgressRing';

const HERO_ART = require('../../assets/images/hero-cinema-light.png');
// Aspect ratio (height / width) of hero-cinema-light.png.
const HERO_RATIO = 388 / 472;

// The trend line under the monthly numbers: the light shade of the app's blue.
const TREND_COLOR = '#9DBBE6';

/** Home: the title and the "Your 2026" hero, then the actions, the numbers and the monthly chart, on ivory. */
export default function HomeScreen() {
  const { colors, mode } = useTheme();
  const insets = useSafeAreaInsets();
  const { library, loading } = useLibrary();

  // Home only shows the current calendar year.
  const year = new Date().getFullYear();
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());

  const derived = useMemo(() => {
    const entriesThisYear = library.entries.filter((entry) => yearOf(entry.watchedAt) === year);

    const uniqueThisYear = new Set(
      entriesThisYear.map((entry) => entry.movieId || entry.title.toLowerCase())
    ).size;
    const theatreVisits = entriesThisYear.length;
    const companion = companionStats(library.entries, year);

    const currentList: AnnualList | undefined = library.annual.find((list) => list.year === year);
    const bucketTotal = currentList?.movies.length ?? 0;
    const bucketWatched = currentList?.movies.filter((movie) => movie.status === 'watched').length ?? 0;

    const monthlyCounts = Array.from({ length: 12 }, () => 0);
    const monthlySpent = Array.from({ length: 12 }, () => 0);
    entriesThisYear.forEach((entry) => {
      const month = toDate(entry.watchedAt).getMonth();
      monthlyCounts[month] += 1;
      if (typeof entry.price === 'number') monthlySpent[month] += entry.price;
    });

    return {
      uniqueThisYear,
      theatreVisits,
      companion,
      bucketTotal,
      bucketWatched,
      monthlyCounts,
      monthlySpent,
      spentTotal: monthlySpent.reduce((sum, amount) => sum + amount, 0),
      hasSpend: monthlySpent.some((amount) => amount > 0),
    };
  }, [library, year]);

  const progressPct =
    derived.bucketTotal > 0 ? Math.round((derived.bucketWatched / derived.bucketTotal) * 100) : 0;

  const shadow = { shadowColor: mode === 'light' ? '#1A2A42' : '#000000' };
  const cardStyle = [styles.card, { backgroundColor: colors.surface, borderColor: colors.borderSoft }, shadow];

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 36, width: '100%', maxWidth: 720, alignSelf: 'center' }}
      >
        {/* The title and the "Your 2026" hero card. */}
        <View style={[styles.top, { paddingTop: insets.top + 14 }]}>
          <BrandMark height={32} />
          <View style={styles.hero}>
            <View style={styles.heroCopy}>
              <Text
                style={[styles.heroTitle, { color: colors.text }]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.8}
              >
                Your <Text style={{ color: colors.accent }}>{year}</Text>
              </Text>
              <Text style={[styles.heroSubtitle, { color: colors.textMuted }]}>
                A private diary of the films that stayed with you.
              </Text>
            </View>
            <Image source={HERO_ART} style={styles.art} resizeMode="contain" />
          </View>
        </View>

        <View style={styles.body}>
          <View style={styles.actionRow}>
            <Pressable
              onPress={() => router.navigate('/log')}
              accessibilityRole="button"
              accessibilityLabel="Log a film"
              style={({ pressed }) => [
                styles.actionButton,
                styles.actionPrimary,
                { backgroundColor: colors.primary, borderColor: colors.primary },
                pressed && styles.pressed,
              ]}
            >
              <Ionicons name="add" size={17} color={colors.primaryText} />
              <Text style={[styles.actionLabel, { color: colors.primaryText }]} numberOfLines={1}>
                Log a film
              </Text>
            </Pressable>
            <Pressable
              onPress={() => router.push('/films')}
              accessibilityRole="button"
              accessibilityLabel="Film database"
              style={({ pressed }) => [
                styles.actionButton,
                { borderColor: colors.border, backgroundColor: colors.surface },
                shadow,
                pressed && styles.pressed,
              ]}
            >
              <Ionicons name="film-outline" size={16} color={colors.text} />
              <Text style={[styles.actionLabel, { color: colors.text }]} numberOfLines={1}>
                Film database
              </Text>
            </Pressable>
          </View>

          {loading ? (
            <View style={styles.loading}>
              <ActivityIndicator color={colors.accent} />
            </View>
          ) : (
            <View style={styles.stack}>
              {/* One soft blue card: films, visits and (once you have entered amounts) spent on top, with Solo and
                  Group in a lighter band underneath. */}
              <View style={[styles.band, { backgroundColor: colors.coralSoft }]}>
                <View style={styles.bandTop}>
                  <BandNumber value={derived.uniqueThisYear} label="FILMS" />
                  <View style={styles.bandDivider} />
                  <BandNumber value={derived.theatreVisits} label="VISITS" />
                  {derived.hasSpend ? (
                    <>
                      <View style={styles.bandDivider} />
                      <BandNumber value={`₹${derived.spentTotal.toLocaleString('en-IN')}`} label="SPENT" small />
                    </>
                  ) : null}
                </View>
                <View style={styles.bandBottom}>
                  <Companion icon="person" label="Solo" value={derived.companion.alone.viewings} />
                  <Companion icon="people" label="Group" value={derived.companion.company.viewings} />
                </View>
              </View>

              {/* Bucket list: a progress ring, the count in words, and a tap through to the watchlist. */}
              <Pressable
                onPress={() => router.navigate('/watchlist')}
                accessibilityRole="button"
                accessibilityLabel={
                  derived.bucketTotal > 0
                    ? `Bucket list, ${derived.bucketWatched} of ${derived.bucketTotal} watched. Open the watchlist`
                    : `Build your ${year} bucket list`
                }
                style={({ pressed }) => [cardStyle, styles.bucket, pressed && styles.pressed]}
              >
                <ProgressRing
                  size={56}
                  stroke={7}
                  progress={progressPct / 100}
                  color={colors.primary}
                  trackColor={colors.border}
                >
                  <Text style={[styles.ringText, { color: colors.text }]}>{progressPct}%</Text>
                </ProgressRing>
                <View style={styles.bucketText}>
                  <Text style={[styles.bucketTitle, { color: colors.text }]}>Bucket list</Text>
                  <Text style={[styles.bucketHint, { color: colors.textMuted }]} numberOfLines={1}>
                    {derived.bucketTotal === 0
                      ? 'No films yet · build your list'
                      : `${derived.bucketWatched} of ${derived.bucketTotal} watched${derived.bucketWatched === 0 ? ' · start with one' : ''}`}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textDim} />
              </Pressable>

              {/* Monthly card, number first. Once amounts are entered, the money is the story: the amount leads and
                  the line follows what you spent each month. Before that, it follows the movies watched. */}
              <View style={cardStyle}>
                <View style={styles.cardHead}>
                  <Ionicons name={derived.hasSpend ? 'cash' : 'bar-chart'} size={15} color={colors.accent} />
                  <Text style={[styles.monthTitle, { color: colors.text }]}>
                    {derived.hasSpend ? 'Monthly spending' : 'Monthly activity'}
                  </Text>
                </View>

                <View style={styles.monthNumbers}>
                  <View>
                    <Text style={[styles.monthName, { color: colors.textMuted }]}>
                      {MONTH_NAMES[selectedMonth].toUpperCase()}
                    </Text>
                    {derived.hasSpend ? (
                      <Text style={[styles.monthCount, { color: colors.text }]}>
                        ₹{derived.monthlySpent[selectedMonth].toLocaleString('en-IN')}
                      </Text>
                    ) : (
                      <View style={styles.monthMovies}>
                        <Text style={[styles.monthCount, { color: colors.text }]}>
                          {derived.monthlyCounts[selectedMonth]}
                        </Text>
                        <Text style={[styles.monthUnit, { color: colors.textMuted }]}>
                          {derived.monthlyCounts[selectedMonth] === 1 ? 'movie' : 'movies'}
                        </Text>
                      </View>
                    )}
                  </View>
                  {derived.hasSpend ? (
                    <View style={styles.monthSpent}>
                      <Text style={[styles.monthName, { color: colors.textMuted }]}>MOVIES</Text>
                      <Text style={[styles.monthAmount, { color: colors.text }]}>
                        {derived.monthlyCounts[selectedMonth]}
                      </Text>
                    </View>
                  ) : null}
                </View>

                <MonthTrend
                  values={derived.hasSpend ? derived.monthlySpent : derived.monthlyCounts}
                  labels={Array.from({ length: 12 }, (_, index) => monthShort(index))}
                  selectedIndex={selectedMonth}
                  onSelect={setSelectedMonth}
                  color={TREND_COLOR}
                />
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

/** One of the three main numbers in the blue band: a big serif value over a small capital label. */
function BandNumber({ value, label, small }: { value: number | string; label: string; small?: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={styles.bandNumber} accessibilityLabel={`${label.toLowerCase()}: ${value}`}>
      <Text style={[styles.bandValue, small && styles.bandValueSmall, { color: colors.text }]} numberOfLines={1}>
        {value}
      </Text>
      <Text style={[styles.bandLabel, { color: colors.coralInk }]}>{label}</Text>
    </View>
  );
}

/** Solo or Group in the lower band: an icon, the word and the number. */
function Companion({ icon, label, value }: { icon: 'person' | 'people'; label: string; value: number }) {
  const { colors } = useTheme();
  return (
    <View style={styles.companion} accessibilityLabel={`${label.toLowerCase()}: ${value}`}>
      <Ionicons name={icon} size={17} color={colors.accent} />
      <Text style={[styles.companionLabel, { color: colors.text }]}>{label}</Text>
      <Text style={[styles.companionValue, { color: colors.text }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  top: {
    paddingHorizontal: 16,
    // A clear gap between the hero card and the buttons.
    paddingBottom: 20,
  },
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  heroCopy: {
    flex: 1,
    minWidth: 0,
  },
  heroTitle: {
    fontFamily: SERIF,
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '700',
    letterSpacing: -0.8,
  },
  heroSubtitle: {
    fontSize: 13.5,
    lineHeight: 19,
    fontWeight: '500',
    marginTop: 2,
  },
  // The illustration fades into the page, so it runs to the screen edge.
  art: {
    width: 150,
    height: Math.round(150 * HERO_RATIO),
    marginRight: -16,
    flexShrink: 0,
  },
  body: {
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  actionButton: {
    flex: 1,
    height: 46,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 8,
    shadowOpacity: 0.14,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 4,
  },
  actionPrimary: {
    shadowColor: '#3B5F94',
    shadowOpacity: 0.32,
  },
  actionLabel: {
    flexShrink: 1,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '800',
    letterSpacing: -0.1,
  },
  pressed: {
    opacity: 0.72,
  },
  loading: {
    paddingTop: SPACE.xxl,
    alignItems: 'center',
  },
  stack: {
    gap: 10,
  },
  band: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  bandTop: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 8,
  },
  bandNumber: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
  },
  bandDivider: {
    width: StyleSheet.hairlineWidth * 2,
    height: 38,
    backgroundColor: 'rgba(59,95,148,0.22)',
  },
  bandValue: {
    fontFamily: SERIF,
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '700',
    letterSpacing: -0.6,
    fontVariant: ['tabular-nums'],
  },
  bandValueSmall: {
    fontSize: 22,
  },
  bandLabel: {
    ...TYPE.eyebrow,
    fontSize: 9.5,
    letterSpacing: 1.2,
  },
  bandBottom: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(255,255,255,0.58)',
    paddingVertical: 11,
  },
  companion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  companionLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  companionValue: {
    fontFamily: SERIF,
    fontSize: 21,
    lineHeight: 25,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  card: {
    padding: 14,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 3,
  },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bucket: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  bucketText: {
    flex: 1,
    minWidth: 0,
  },
  bucketTitle: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  bucketHint: {
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '600',
    marginTop: 2,
  },
  ringText: {
    fontSize: 13,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  monthNumbers: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 8,
    marginBottom: 6,
  },
  monthName: {
    ...TYPE.eyebrow,
    fontSize: 10,
    letterSpacing: 1.2,
  },
  monthMovies: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  monthCount: {
    fontFamily: SERIF,
    fontSize: 38,
    lineHeight: 44,
    fontWeight: '700',
    letterSpacing: -1,
    fontVariant: ['tabular-nums'],
  },
  monthUnit: {
    fontSize: 14,
    fontWeight: '600',
  },
  monthSpent: {
    alignItems: 'flex-end',
  },
  monthAmount: {
    fontFamily: SERIF,
    fontSize: 26,
    lineHeight: 34,
    fontWeight: '700',
    letterSpacing: -0.5,
    fontVariant: ['tabular-nums'],
  },
  monthTitle: {
    flex: 1,
    fontSize: 15,
    lineHeight: 18,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
});
