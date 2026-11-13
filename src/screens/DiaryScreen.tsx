import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SPACE, RADIUS, TYPE, useTheme } from '../theme';
import { useLibrary } from '../hooks/useLibrary';
import { resolvePoster, type ViewingEntry } from '../lib/library';
import { formatDate, formatMonthYear, toDate } from '../lib/format';
import { ScreenHeader } from '../components/ScreenHeader';
import { EmptyState } from '../components/EmptyState';
import { Card } from '../components/Card';
import { Chip } from '../components/Chip';
import { ActionButton } from '../components/ActionButton';
import { Poster } from '../components/Poster';
import { RatingStars } from '../components/RatingStars';

interface DiaryGroup {
  key: string;
  label: string;
  entries: ViewingEntry[];
}

const ALL_YEARS = 'all';

export default function DiaryScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { library, loading } = useLibrary();
  const [yearFilter, setYearFilter] = useState<string>(ALL_YEARS);

  const years = useMemo(() => {
    const set = new Set<number>(library.entries.map((entry) => toDate(entry.watchedAt).getFullYear()));
    return Array.from(set).sort((a, b) => b - a);
  }, [library.entries]);

  const { groups, summary, shown } = useMemo(() => {
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

    const rated = filtered.filter((entry) => typeof entry.rating === 'number');
    const avg =
      rated.length > 0 ? rated.reduce((sum, entry) => sum + (entry.rating ?? 0), 0) / rated.length : 0;

    return {
      groups: Array.from(map.values()),
      shown: sorted.length,
      summary: {
        visits: filtered.length,
        unique: new Set(filtered.map((entry) => entry.movieId)).size,
        average: avg,
      },
    };
  }, [library.entries, yearFilter]);

  const hasEntries = library.entries.length > 0;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: insets.bottom + SPACE.xxl,
          width: '100%',
          maxWidth: 720,
          alignSelf: 'center',
          flexGrow: 1,
        }}
      >
        <ScreenHeader
          eyebrow="Watching history"
          title="Diary"
          subtitle="Every theatre visit, remembered."
        />

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
            <Card style={styles.summary}>
              <SummaryItem label="Visits" value={String(summary.visits)} />
              <View style={[styles.divider, { backgroundColor: colors.borderSoft }]} />
              <SummaryItem label="Films" value={String(summary.unique)} />
              <View style={[styles.divider, { backgroundColor: colors.borderSoft }]} />
              <SummaryItem
                label="Avg rating"
                value={summary.average > 0 ? summary.average.toFixed(1) : '—'}
                accent={colors.star}
              />
            </Card>

            <View style={styles.addRow}>
              <ActionButton
                label="Log a viewing"
                icon="add"
                onPress={() => router.navigate({ pathname: '/log', params: { from: 'diary' } })}
                fullWidth
              />
            </View>

            <View style={styles.yearRow}>
              <Chip label="All years" active={yearFilter === ALL_YEARS} onPress={() => setYearFilter(ALL_YEARS)} />
              {years.map((year) => (
                <Chip
                  key={year}
                  label={String(year)}
                  active={yearFilter === String(year)}
                  onPress={() => setYearFilter(String(year))}
                />
              ))}
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
                  <Text style={[styles.groupCount, { color: colors.textDim }]}>
                    {group.entries.length} {group.entries.length === 1 ? 'visit' : 'visits'}
                  </Text>
                </View>

                {group.entries.map((entry) => (
                  <Pressable
                    key={entry.id}
                    style={({ pressed }) => [
                      styles.entry,
                      { backgroundColor: colors.surface, borderColor: colors.borderSoft },
                      pressed && { opacity: 0.8 },
                    ]}
                    onPress={() =>
                      router.navigate({
                        pathname: '/log',
                        params: { editEntryId: entry.id, from: 'diary' },
                      })
                    }
                    accessibilityRole="button"
                    accessibilityLabel={`Edit ${entry.title}`}
                  >
                    <Poster
                      uri={resolvePoster(library, entry.movieId, entry.title)}
                      title={entry.title}
                      width={56}
                      radius={RADIUS.sm}
                    />
                    <View style={styles.entryBody}>
                      <View style={styles.titleRow}>
                        <Text style={[styles.entryTitle, { color: colors.text }]} numberOfLines={1}>
                          {entry.title}
                        </Text>
                        <Ionicons name="create-outline" size={16} color={colors.textDim} />
                      </View>
                      <Text style={[styles.meta, { color: colors.textMuted }]} numberOfLines={1}>
                        {formatDate(entry.watchedAt)}
                        {entry.theatre ? `  ·  ${entry.theatre}` : ''}
                      </Text>
                      {typeof entry.rating === 'number' && entry.rating > 0 ? (
                        <RatingStars value={entry.rating} size={12} showValue />
                      ) : null}
                      {entry.notes ? (
                        <Text style={[styles.notes, { color: colors.textMuted }]} numberOfLines={2}>
                          {entry.notes}
                        </Text>
                      ) : null}
                    </View>
                  </Pressable>
                ))}
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function SummaryItem({ label, value, accent }: { label: string; value: string; accent?: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.summaryItem}>
      <Text style={[styles.summaryValue, { color: accent ?? colors.text }]}>{value}</Text>
      <Text style={[styles.summaryLabel, { color: colors.textDim }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  addButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loading: {
    paddingTop: SPACE.xxxl,
    alignItems: 'center',
  },
  emptyWrap: {
    paddingHorizontal: SPACE.xl,
    paddingTop: SPACE.lg,
  },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: SPACE.xl,
    marginBottom: SPACE.md,
    paddingVertical: SPACE.lg,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryValue: {
    ...TYPE.number,
    fontSize: 24,
  },
  summaryLabel: {
    ...TYPE.eyebrow,
    fontSize: 10,
    marginTop: 4,
  },
  divider: {
    width: StyleSheet.hairlineWidth,
    height: 32,
  },
  addRow: {
    paddingHorizontal: SPACE.xl,
    marginBottom: SPACE.lg,
  },
  yearRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACE.sm,
    paddingHorizontal: SPACE.xl,
    marginBottom: SPACE.xl,
  },
  noneNote: {
    ...TYPE.small,
    textAlign: 'center',
    paddingHorizontal: SPACE.xl,
    marginBottom: SPACE.xl,
  },
  group: {
    paddingHorizontal: SPACE.xl,
    marginBottom: SPACE.lg,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: SPACE.sm,
  },
  groupLabel: {
    ...TYPE.heading,
  },
  groupCount: {
    ...TYPE.caption,
  },
  entry: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACE.md,
    padding: SPACE.md,
    borderRadius: RADIUS.lg,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: SPACE.sm,
  },
  entryBody: {
    flex: 1,
    gap: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACE.sm,
  },
  entryTitle: {
    ...TYPE.body,
    fontWeight: '700',
    flexShrink: 1,
  },
  meta: {
    ...TYPE.caption,
    fontWeight: '500',
  },
  notes: {
    ...TYPE.caption,
    fontStyle: 'italic',
    lineHeight: 17,
  },
});
