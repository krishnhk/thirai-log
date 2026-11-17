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
import { AppHeader } from '../components/AppHeader';
import { StatCard } from '../components/StatCard';
import { MonthChart } from '../components/MonthChart';

const HERO_WASH = require('../../assets/images/hero-wash-clean.png');
const HERO_ART = require('../../assets/images/hero-cinema-dark.png');
const HERO_ART_LIGHT = require('../../assets/images/hero-cinema-light.png');
// Aspect ratio (height / width) of hero-cinema-light.png.
const HERO_LIGHT_RATIO = 388 / 472;

export default function HomeScreen() {
  const { colors, mode } = useTheme();
  const { width } = useWindowDimensions();
  const { library, loading } = useLibrary();

  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());

  const years = useMemo(() => {
    const set = new Set<number>([currentYear]);
    library.entries.forEach((entry) => set.add(yearOf(entry.watchedAt)));
    library.annual.forEach((list) => set.add(list.year));
    return Array.from(set).sort((a, b) => b - a);
  }, [library, currentYear]);

  const yearIndex = Math.max(0, years.indexOf(year));
  const cycleYear = () => {
    const next = years[(yearIndex + 1) % years.length];
    setYear(next ?? currentYear);
  };

  const derived = useMemo(() => {
    const entriesThisYear = library.entries.filter((entry) => yearOf(entry.watchedAt) === year);

    const uniqueThisYear = new Set(
      entriesThisYear.map((entry) => entry.movieId || entry.title.toLowerCase())
    ).size;
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

    return {
      uniqueThisYear,
      theatreVisits,
      bucketTotal,
      bucketWatched,
      monthlyCounts,
    };
  }, [library, year]);

  const progressPct =
    derived.bucketTotal > 0
      ? Math.round((derived.bucketWatched / derived.bucketTotal) * 100)
      : 0;
  const isDark = mode === 'dark';
  const artWidth = isDark ? Math.min(120, width * 0.32) : Math.min(168, width * 0.42);
  const artHeight = Math.round(artWidth * (isDark ? 1.12 : HERO_LIGHT_RATIO));

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
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
          {isDark ? <Image source={HERO_WASH} style={styles.wash} resizeMode="cover" /> : null}

          <View style={styles.headerLayer}>
            <AppHeader />
          </View>

          <View style={styles.hero}>
            <Image
              source={isDark ? HERO_ART : HERO_ART_LIGHT}
              style={[
                styles.heroArt,
                isDark ? styles.heroArtDark : styles.heroArtLight,
                { width: artWidth, height: artHeight },
              ]}
              resizeMode={isDark ? 'stretch' : 'cover'}
            />
            <View style={styles.heroCopy}>
              <Text style={[styles.heroTitle, { color: colors.text }]}>
                Your <Text style={{ color: colors.accent }}>{year}</Text>
              </Text>
              <Text style={[styles.heroSubtitle, { color: colors.textMuted }]}>
                A private diary of the films that stayed with you.
              </Text>
            </View>
          </View>
        </View>

        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.accent} />
          </View>
        ) : (
          <>
            <View
              style={[
                styles.visitCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.borderSoft,
                  shadowColor: mode === 'light' ? '#1A3152' : '#000000',
                },
              ]}
            >
              <View style={styles.visitHead}>
                <Ionicons name="ticket-outline" size={18} color={colors.coralInk} />
                <Text style={[styles.visitLabel, { color: colors.coralInk }]}>Theatre visits</Text>
                <YearPill label={String(year)} onPress={cycleYear} />
              </View>

              <View style={styles.visitMain}>
                <View style={styles.visitCountWrap}>
                  <Text style={[styles.visitNumber, { color: colors.text }]}>
                    {derived.theatreVisits}
                  </Text>
                  <Text style={[styles.visitUnit, { color: colors.text, opacity: 0.8 }]}>
                    {derived.theatreVisits === 1 ? 'visit' : 'visits'} in {year}
                  </Text>
                </View>

                {derived.bucketTotal > 0 ? (
                  <Text style={[styles.visitRatio, { color: colors.accent }]}>
                    {derived.bucketWatched} / {derived.bucketTotal}
                  </Text>
                ) : (
                  <Pressable
                    onPress={() => router.navigate('/watchlist')}
                    style={styles.buildLink}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel={`Build your ${year} bucket list`}
                  >
                    <Ionicons name="sparkles-outline" size={11} color={colors.accent} />
                    <Text style={[styles.buildLinkText, { color: colors.accent }]}>
                      Build list
                    </Text>
                  </Pressable>
                )}
              </View>

              <View style={[styles.progressTrack, { backgroundColor: colors.surfaceAlt }]}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${Math.min(100, progressPct)}%`,
                      backgroundColor: colors.accent,
                    },
                  ]}
                />
              </View>
              <Text style={[styles.progressLabel, { color: colors.text, opacity: 0.8 }]}>
                {derived.bucketTotal > 0 ? `${progressPct}% watched` : 'No bucket list yet'}
              </Text>

              <View style={styles.actionRow}>
                <Pressable
                  onPress={() => router.navigate('/log')}
                  accessibilityRole="button"
                  accessibilityLabel="Log a film"
                  style={({ pressed }) => [
                    styles.actionButton,
                    styles.primaryButton,
                    { backgroundColor: colors.primary },
                    pressed && styles.pressed,
                  ]}
                >
                  <Ionicons name="add" size={16} color={colors.primaryText} />
                  <Text style={[styles.actionLabel, { color: colors.primaryText }]}>
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
                  <Text style={[styles.actionLabel, { color: colors.text }]}>
                    Film database
                  </Text>
                </Pressable>
              </View>
            </View>

            <View style={styles.statRow}>
              <StatCard
                compact
                tone="blue"
                label="Films this year"
                value={derived.uniqueThisYear}
                icon="film-outline"
                hint="unique titles"
              />
              <StatCard
                compact
                tone="mint"
                label="Bucket list"
                value={derived.bucketTotal}
                icon="bookmark-outline"
                hint={`${derived.bucketWatched} watched`}
                badge={derived.bucketWatched > 0 ? 'checkmark' : undefined}
              />
            </View>

            <View
              style={[
                styles.monthCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.borderSoft,
                  shadowColor: mode === 'light' ? '#1A3152' : '#000000',
                },
              ]}
            >
              <View style={styles.monthHead}>
                <View style={styles.monthTitleRow}>
                  <Ionicons name="bar-chart" size={16} color={colors.accent} />
                  <Text style={[styles.monthTitle, { color: colors.text }]}>Monthly activity</Text>
                </View>
                <YearPill label={String(year)} onPress={cycleYear} />
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
          </>
        )}
      </ScrollView>
    </View>
  );
}

function YearPill({ label, onPress }: { label: string; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Change year, currently ${label}`}
      hitSlop={6}
      style={({ pressed }) => [
        styles.yearPill,
        { backgroundColor: colors.surfaceAlt },
        pressed && styles.pressed,
      ]}
    >
      <Text style={[styles.yearPillText, { color: colors.text }]}>{label}</Text>
      <Ionicons name="chevron-down" size={11} color={colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  topShell: {
    position: 'relative',
    paddingBottom: 1,
  },
  wash: {
    position: 'absolute',
    top: -22,
    left: -26,
    width: '116%',
    height: 320,
    opacity: 1,
  },
  headerLayer: {
    zIndex: 3,
  },
  hero: {
    height: 142,
    paddingHorizontal: 16,
    zIndex: 2,
  },
  heroArt: {
    position: 'absolute',
    right: -6,
  },
  heroArtDark: {
    top: 4,
  },
  heroArtLight: {
    right: 0,
    bottom: 30,
  },
  heroCopy: {
    paddingTop: 8,
    maxWidth: 250,
    zIndex: 2,
  },
  heroTitle: {
    fontFamily: SERIF,
    fontSize: 36,
    lineHeight: 42,
    fontWeight: '700',
    letterSpacing: -0.8,
  },
  heroSubtitle: {
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '500',
    marginTop: 2,
    maxWidth: 190,
  },
  loading: {
    paddingTop: SPACE.xxl,
    alignItems: 'center',
  },
  visitCard: {
    marginHorizontal: 12,
    marginTop: -30,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 12,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    shadowOpacity: 0.07,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
    zIndex: 1,
  },
  visitHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    minHeight: 26,
  },
  visitLabel: {
    ...TYPE.eyebrow,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 1.1,
    flex: 1,
  },
  yearPill: {
    height: 26,
    paddingHorizontal: 10,
    borderRadius: RADIUS.pill,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  yearPillText: {
    fontSize: 12,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  visitMain: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: SPACE.sm,
    marginTop: 2,
  },
  visitCountWrap: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 9,
  },
  visitNumber: {
    fontFamily: SERIF,
    fontSize: 44,
    lineHeight: 46,
    fontWeight: '700',
    letterSpacing: -1.5,
    fontVariant: ['tabular-nums'],
  },
  visitUnit: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '500',
  },
  visitRatio: {
    fontSize: 14,
    fontWeight: '800',
    paddingBottom: 4,
    fontVariant: ['tabular-nums'],
  },
  buildLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingBottom: 4,
  },
  buildLinkText: {
    fontSize: 11,
    fontWeight: '700',
  },
  progressTrack: {
    height: 8,
    borderRadius: RADIUS.pill,
    overflow: 'hidden',
    marginTop: 4,
  },
  progressFill: {
    height: '100%',
    borderRadius: RADIUS.pill,
  },
  progressLabel: {
    fontSize: 12.5,
    lineHeight: 16,
    fontWeight: '500',
    marginTop: 5,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  actionButton: {
    flex: 1,
    height: 40,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    borderColor: 'transparent',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 8,
  },
  primaryButton: {
    borderColor: 'transparent',
  },
  actionLabel: {
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '700',
    letterSpacing: -0.1,
  },
  pressed: {
    opacity: 0.72,
  },
  statRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 12,
    marginTop: 10,
  },
  monthCard: {
    marginHorizontal: 12,
    marginTop: 10,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 8,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    shadowOpacity: 0.05,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 7 },
    elevation: 3,
  },
  monthHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACE.sm,
  },
  monthTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  monthTitle: {
    fontSize: 15,
    lineHeight: 18,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
});