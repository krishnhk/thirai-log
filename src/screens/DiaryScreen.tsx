import React, { useMemo, useState } from 'react';
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
import { RADIUS, SERIF, SPACE, TYPE, useTheme } from '../theme';
import { useLibrary } from '../hooks/useLibrary';
import { resolvePoster, type ViewingEntry } from '../lib/library';
import { formatMonthYear, formatShortDate, toDate } from '../lib/format';
import { AppHeader } from '../components/AppHeader';
import { EmptyState } from '../components/EmptyState';
import { Poster } from '../components/Poster';

interface DiaryGroup {
  key: string;
  label: string;
  entries: ViewingEntry[];
}

const ALL_YEARS = 'all';

export default function DiaryScreen() {
  const { colors } = useTheme();
  const { library, loading } = useLibrary();
  const [yearFilter, setYearFilter] = useState<string>(ALL_YEARS);

  const years = useMemo(() => {
    const set = new Set<number>(library.entries.map((entry) => toDate(entry.watchedAt).getFullYear()));
    return Array.from(set).sort((a, b) => b - a);
  }, [library.entries]);

  const currentYear = new Date().getFullYear();
  const totals = useMemo(
    () => ({
      all: library.entries.length,
      thisYear: library.entries.filter(
        (entry) => toDate(entry.watchedAt).getFullYear() === currentYear
      ).length,
    }),
    [library.entries, currentYear]
  );

  const { groups, shown } = useMemo(() => {
    const filtered =
      yearFilter === ALL_YEARS
        ? library.entries
        : library.entries.filter((entry) => String(toDate(entry.watchedAt).getFullYear()) === yearFilter);

    const sorted = [...filtered].sort(
      (a, b) => toDate(b.watchedAt).getTime() - toDate(a.watchedAt).getTime()
    );

    const map = new Map<string, DiaryGroup>();
    sorted.forEach((entry) => {
      const date = toDate(entry.watchedAt);
      const key = `${date.getFullYear()}-${date.getMonth()}`;
      if (!map.has(key)) {
        map.set(key, { key, label: formatMonthYear(entry.watchedAt), entries: [] });
      }
      map.get(key)?.entries.push(entry);
    });

    return { groups: Array.from(map.values()), shown: sorted.length };
  }, [library.entries, yearFilter]);

  const hasEntries = library.entries.length > 0;

  const yearOptions: { key: string; label: string }[] = [
    ...years.map((year) => ({ key: String(year), label: String(year) })),
    { key: ALL_YEARS, label: 'All Years' },
  ];

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
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
        <AppHeader />

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
            <View style={styles.summaryRow}>
              <SummaryCard
                tone="blue"
                icon="film"
                label="Total Entries"
                value={totals.all}
                hint="Movies logged"
              />
              <SummaryCard
                tone="mint"
                icon="calendar"
                label="This Year"
                value={totals.thisYear}
                hint={`Entries in ${currentYear}`}
              />
            </View>

            <View
              style={[
                styles.yearBar,
                { backgroundColor: colors.surface, borderColor: colors.borderSoft },
              ]}
            >
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.yearRow}
              >
                {yearOptions.map((option, index) => {
                  const active = yearFilter === option.key;
                  const next = yearOptions[index + 1];
                  const showDivider = !active && next && yearFilter !== next.key;
                  return (
                    <Pressable
                      key={option.key}
                      onPress={() => setYearFilter(option.key)}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                      style={[
                        styles.yearItem,
                        active && { backgroundColor: colors.primary },
                      ]}
                    >
                      <Text
                        style={[
                          styles.yearLabel,
                          { color: active ? colors.primaryText : colors.text },
                        ]}
                        numberOfLines={1}
                      >
                        {option.label}
                      </Text>
                      {showDivider ? (
                        <View style={[styles.yearDivider, { backgroundColor: colors.border }]} />
                      ) : null}
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            {shown === 0 ? (
              <Text style={[styles.noneNote, { color: colors.textMuted }]}>
                No visits logged in {yearFilter}.
              </Text>
            ) : null}

            {groups.map((group) => (
              <View key={group.key} style={styles.group}>
                <View style={styles.groupHeader}>
                  <Text style={[styles.groupLabel, { color: colors.text }]}>{group.label}</Text>
                  <Text style={[styles.groupCount, { color: colors.text, opacity: 0.7 }]}>
                    {group.entries.length} {group.entries.length === 1 ? 'visit' : 'visits'}
                  </Text>
                </View>

                {group.entries.map((entry) => {
                  const rating = typeof entry.rating === 'number' ? entry.rating : 0;
                  return (
                    <Pressable
                      key={entry.id}
                      style={({ pressed }) => [
                        styles.entry,
                        { backgroundColor: colors.surface, borderColor: colors.borderSoft },
                        pressed && { opacity: 0.82 },
                      ]}
                      onPress={() =>
                        router.push({ pathname: '/viewing/[entryId]', params: { entryId: entry.id } })
                      }
                      // No button role here: the Edit control below is a nested button.
                      accessible
                      accessibilityLabel={`Open ${entry.title}`}
                    >
                      <Poster
                        uri={resolvePoster(library, entry.movieId, entry.title)}
                        title={entry.title}
                        width={40}
                        radius={RADIUS.md}
                      />
                      <View style={styles.entryBody}>
                        <Text style={[styles.entryTitle, { color: colors.text }]} numberOfLines={2}>
                          {entry.title}
                        </Text>
                        <View style={styles.metaRow}>
                          <Ionicons name="calendar-outline" size={13} color={colors.textMuted} />
                          <Text
                            style={[styles.meta, { color: colors.text }]}
                            numberOfLines={1}
                          >
                            {formatShortDate(entry.watchedAt)}
                            {entry.theatre ? ` · ${entry.theatre}` : ''}
                          </Text>
                          {rating > 0 ? (
                            <View style={styles.ratingBadge}>
                              <Ionicons name="star" size={10} color={colors.star} />
                              <Text style={[styles.ratingText, { color: colors.textMuted }]}>
                                {rating.toFixed(1)}
                              </Text>
                            </View>
                          ) : null}
                        </View>
                        {entry.notes ? (
                          <Text
                            style={[styles.notes, { color: colors.textDim }]}
                            numberOfLines={1}
                          >
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
          </>
        )}
      </ScrollView>
    </View>
  );
}

function SummaryCard({
  tone,
  icon,
  label,
  value,
  hint,
}: {
  tone: 'blue' | 'mint';
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  value: number;
  hint: string;
}) {
  const { colors } = useTheme();
  const palette =
    tone === 'blue'
      ? { bg: colors.coralSoft, ink: colors.coralInk, mark: colors.coral }
      : { bg: colors.sageSoft, ink: colors.sageInk, mark: colors.sage };
  return (
    <View style={[styles.summaryCard, { backgroundColor: palette.bg }]}>
      <View style={styles.summaryHead}>
        <Ionicons name={icon} size={18} color={palette.mark} />
        <Text style={[styles.summaryLabel, { color: palette.ink }]}>
          {label}
        </Text>
      </View>
      <Text style={[styles.summaryValue, { color: colors.text }]}>{value}</Text>
      <Text style={[styles.summaryHint, { color: palette.ink }]}>
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
  summaryRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
    marginTop: 10,
  },
  summaryCard: {
    flex: 1,
    minWidth: 0,
    padding: 11,
    borderRadius: 16,
  },
  summaryHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  summaryLabel: {
    flex: 1,
    fontSize: 13.5,
    lineHeight: 17,
    fontWeight: '800',
    letterSpacing: -0.1,
  },
  summaryValue: {
    fontFamily: SERIF,
    fontSize: 32,
    lineHeight: 36,
    fontWeight: '700',
    letterSpacing: -0.8,
    marginTop: 2,
    fontVariant: ['tabular-nums'],
  },
  summaryHint: {
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '600',
  },
  yearBar: {
    marginHorizontal: 12,
    marginTop: 10,
    height: 40,
    borderRadius: RADIUS.pill,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  yearRow: {
    flexGrow: 1,
    alignItems: 'center',
    padding: 4,
  },
  yearItem: {
    flexGrow: 1,
    height: 32,
    minWidth: 60,
    paddingHorizontal: 12,
    borderRadius: RADIUS.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  yearLabel: {
    fontSize: 13.5,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  yearDivider: {
    position: 'absolute',
    right: 0,
    top: 8,
    bottom: 8,
    width: StyleSheet.hairlineWidth * 2,
  },
  noneNote: {
    ...TYPE.caption,
    fontSize: 12,
    textAlign: 'center',
    paddingHorizontal: SPACE.lg,
    marginTop: SPACE.md,
  },
  group: {
    paddingHorizontal: 12,
    marginTop: 8,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: 5,
    paddingHorizontal: 4,
    gap: SPACE.sm,
  },
  groupLabel: {
    fontFamily: SERIF,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  groupCount: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  entry: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 8,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 6,
    shadowColor: '#142A45',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },
  entryBody: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
  },
  entryTitle: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.2,
    lineHeight: 19,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 3,
  },
  meta: {
    flexShrink: 1,
    minWidth: 0,
    fontSize: 12.5,
    lineHeight: 16,
    fontWeight: '500',
    opacity: 0.78,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginLeft: 4,
  },
  ratingText: {
    fontSize: 11.5,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
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
    marginRight: 2,
  },
});
