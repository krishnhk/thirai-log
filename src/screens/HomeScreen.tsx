import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { RADIUS, SERIF, SPACE, TYPE, useTheme } from '../theme';
import { useLibrary } from '../hooks/useLibrary';
import type { AnnualList } from '../lib/library';
import { monthShort, toDate, yearOf } from '../lib/format';
import { companionStats } from '../lib/stats';
import { AppHeader } from '../components/AppHeader';
import { StatCard } from '../components/StatCard';
import { MonthChart } from '../components/MonthChart';

const HERO_ART = require('../../assets/images/hero-cinema-dark.png');
const HERO_ART_LIGHT = require('../../assets/images/hero-cinema-light.png');
// Aspect ratio (height / width) of hero-cinema-light.png.
const HERO_LIGHT_RATIO = 388 / 472;

export default function HomeScreen() {
  const { colors, mode } = useTheme();
  const { width } = useWindowDimensions();
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

    const currentList: AnnualList | undefined = library.annual.find(
      (list) => list.year === year
    );
    const bucketTotal = currentList?.movies.length ?? 0;
    const bucketWatched =
      currentList?.movies.filter((movie) => movie.status === 'watched').length ?? 0;

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
      hasSpend: monthlySpent.some((amount) => amount > 0),
    };
  }, [library, year]);

  const progressPct =
    derived.bucketTotal > 0
      ? Math.round((derived.bucketWatched / derived.bucketTotal) * 100)
      : 0;

  const isDark = mode === 'dark';
  // Both illustrations are shown whole (never stretched) in a fixed box on the right.
  const artWidth = isDark ? Math.min(112, width * 0.3) : Math.min(156, width * 0.38);
  const artHeight = isDark ? artWidth : Math.round(artWidth * HERO_LIGHT_RATIO);

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
        <View style={styles.topShell}>
          <View style={styles.hero}>
            <View style={styles.heroCopy}>
              <Text
                style={[
                  styles.heroTitle,
                  { color: colors.text },
                  // Keeps "Your 2026" on one line next to the illustration on narrow phones.
                  width < 360 && { fontSize: 27, lineHeight: 33 },
                ]}
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
            <Image
              source={isDark ? HERO_ART : HERO_ART_LIGHT}
              style={[styles.heroArt, !isDark && styles.heroArtBleed, { width: artWidth, height: artHeight }]}
              resizeMode="contain"
            />
          </View>
        </View>

        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.accent} />
          </View>
        ) : (
          <View style={styles.stack}>
            {/* Theatre visits: one strip of three equal counts, then the two actions. */}
            <View
              style={[
                styles.card,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.borderSoft,
                  shadowColor: mode === 'light' ? '#1A2A42' : '#000000',
                },
              ]}
            >
              <View style={styles.cardHead}>
                <Ionicons name="ticket-outline" size={18} color={colors.coralInk} />
                <Text style={[styles.cardLabel, { color: colors.coralInk }]}>Theatre visits</Text>
              </View>

              <View style={styles.strip}>
                <Count value={derived.theatreVisits} label="Visits" />
                <View style={[styles.stripDivider, { backgroundColor: colors.borderSoft }]} />
                <Count value={derived.companion.alone.viewings} label="Solo" />
                <View style={[styles.stripDivider, { backgroundColor: colors.borderSoft }]} />
                <Count value={derived.companion.company.viewings} label="Group" />
              </View>

              <View style={styles.actionRow}>
                <Pressable
                  onPress={() => router.navigate('/log')}
                  accessibilityRole="button"
                  accessibilityLabel="Log a film"
                  style={({ pressed }) => [
                    styles.actionButton,
                    { backgroundColor: colors.primary, borderColor: colors.primary },
                    pressed && styles.pressed,
                  ]}
                >
                  <Ionicons name="add" size={16} color={colors.primaryText} />
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
                    { borderColor: colors.border, backgroundColor: 'transparent' },
                    pressed && styles.pressed,
                  ]}
                >
                  <Ionicons name="film-outline" size={16} color={colors.text} />
                  <Text style={[styles.actionLabel, { color: colors.text }]} numberOfLines={1}>
                    Film database
                  </Text>
                </Pressable>
              </View>
            </View>

            {/* Two equal cards: films this year and the bucket list with its progress. */}
            <View style={styles.statRow}>
              <StatCard
                compact
                tone="blue"
                label="Films this year"
                value={derived.uniqueThisYear}
                icon="film-outline"
                hint="unique titles"
              />

              <View style={[styles.bucketCard, { backgroundColor: colors.sageSoft }]}>
                <Text style={[styles.bucketLabel, { color: colors.sageInk }]}>BUCKET LIST</Text>
                <Text style={[styles.bucketValue, { color: colors.text }]}>
                  {derived.bucketTotal > 0 ? `${derived.bucketWatched}/${derived.bucketTotal}` : '0'}
                </Text>
                <View style={[styles.bucketTrack, { backgroundColor: `${colors.sage}33` }]}>
                  <View
                    style={[
                      styles.bucketFill,
                      { width: `${Math.min(100, progressPct)}%`, backgroundColor: colors.sage },
                    ]}
                  />
                </View>
                {derived.bucketTotal > 0 ? (
                  <Text style={[styles.bucketHint, { color: colors.sageInk }]} numberOfLines={1}>
                    {progressPct}% watched
                  </Text>
                ) : (
                  <Pressable
                    onPress={() => router.navigate('/watchlist')}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel={`Build your ${year} bucket list`}
                    style={styles.buildLink}
                  >
                    <Ionicons name="sparkles-outline" size={12} color={colors.sageInk} />
                    <Text style={[styles.bucketHint, { color: colors.sageInk }]} numberOfLines={1}>
                      Build list
                    </Text>
                  </Pressable>
                )}
              </View>
            </View>

            <View
              style={[
                styles.card,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.borderSoft,
                  shadowColor: mode === 'light' ? '#1A2A42' : '#000000',
                },
              ]}
            >
              <View style={styles.cardHead}>
                <Ionicons name="bar-chart" size={16} color={colors.accent} />
                <Text style={[styles.monthTitle, { color: colors.text }]}>Monthly activity</Text>
              </View>

              <MonthChart
                compact
                counts={derived.monthlyCounts}
                labels={Array.from({ length: 12 }, (_, index) => monthShort(index))}
                selectedIndex={selectedMonth}
                onSelect={setSelectedMonth}
                accent={colors.accent}
                selectedColor={colors.accent}
              />
            </View>

            {/* What you spent each month this year, from the amounts entered on viewings. */}
            {derived.hasSpend ? (
              <View
                style={[
                  styles.card,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.borderSoft,
                    shadowColor: mode === 'light' ? '#1A2A42' : '#000000',
                  },
                ]}
              >
                <View style={styles.cardHead}>
                  <Ionicons name="cash" size={16} color={colors.accent} />
                  <Text style={[styles.monthTitle, { color: colors.text }]}>Monthly spending</Text>
                </View>

                <MonthChart
                  compact
                  counts={derived.monthlySpent}
                  labels={Array.from({ length: 12 }, (_, index) => monthShort(index))}
                  selectedIndex={selectedMonth}
                  onSelect={setSelectedMonth}
                  accent={colors.accent}
                  selectedColor={colors.accent}
                  formatValue={(amount) => (amount >= 1000 ? `${Math.round(amount / 100) / 10}k` : String(Math.round(amount)))}
                />
              </View>
            ) : null}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function Count({ value, label }: { value: number; label: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.count} accessibilityLabel={`${label}: ${value}`}>
      <Text style={[styles.countValue, { color: colors.text }]}>{value}</Text>
      <Text style={[styles.countLabel, { color: colors.textMuted }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  topShell: {
    position: 'relative',
  },
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 14,
    gap: 8,
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
  heroArt: {
    flexShrink: 0,
  },
  // The light illustration is cut to blend into the page edge, so it runs to the screen edge.
  heroArtBleed: {
    marginRight: -16,
  },
  loading: {
    paddingTop: SPACE.xxl,
    alignItems: 'center',
  },
  stack: {
    paddingHorizontal: 12,
    gap: 10,
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
  cardLabel: {
    ...TYPE.eyebrow,
    fontSize: 11,
    letterSpacing: 1.1,
  },
  strip: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  stripDivider: {
    width: StyleSheet.hairlineWidth * 2,
    height: 40,
  },
  count: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
  },
  countValue: {
    fontFamily: SERIF,
    fontSize: 32,
    lineHeight: 36,
    fontWeight: '700',
    letterSpacing: -0.8,
    fontVariant: ['tabular-nums'],
  },
  countLabel: {
    fontSize: 12.5,
    lineHeight: 16,
    fontWeight: '700',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  actionButton: {
    flex: 1,
    height: 42,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 8,
  },
  actionLabel: {
    flexShrink: 1,
    fontSize: 13.5,
    lineHeight: 17,
    fontWeight: '700',
    letterSpacing: -0.1,
  },
  pressed: {
    opacity: 0.72,
  },
  statRow: {
    flexDirection: 'row',
    gap: 10,
  },
  bucketCard: {
    flex: 1,
    minWidth: 0,
    padding: 11,
    borderRadius: RADIUS.xl,
  },
  bucketLabel: {
    ...TYPE.eyebrow,
    fontSize: 10,
    lineHeight: 13,
    letterSpacing: 1,
  },
  bucketValue: {
    ...TYPE.number,
    fontSize: 30,
    lineHeight: 33,
    letterSpacing: -0.8,
    marginTop: 2,
  },
  bucketTrack: {
    height: 6,
    borderRadius: RADIUS.pill,
    overflow: 'hidden',
    marginTop: 4,
  },
  bucketFill: {
    height: '100%',
    borderRadius: RADIUS.pill,
  },
  bucketHint: {
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '700',
    marginTop: 4,
  },
  buildLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  monthTitle: {
    flex: 1,
    fontSize: 15,
    lineHeight: 18,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
});
