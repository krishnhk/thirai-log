import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme';
import type { EntryStatus } from '../lib/library';

const LABELS: Record<EntryStatus, string> = {
  planned: 'Planned',
  watched: 'Watched',
  skipped: 'Skipped',
  postponed: 'Postponed',
};

interface StatusPillProps {
  status: EntryStatus;
  small?: boolean;
}

export function StatusPill({ status, small }: StatusPillProps) {
  const { colors } = useTheme();

  const tint =
    status === 'watched'
      ? colors.teal
      : status === 'skipped'
        ? colors.rose
        : status === 'postponed'
          ? colors.gold
          : colors.blue;

  return (
    <View
      style={[
        styles.pill,
        small && styles.pillSmall,
        { backgroundColor: `${tint}22`, borderColor: `${tint}55` },
      ]}
    >
      <View style={[styles.dot, { backgroundColor: tint }]} />
      <Text
        style={[
          styles.label,
          small && styles.labelSmall,
          { color: tint },
        ]}
      >
        {LABELS[status]}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  pillSmall: {
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  labelSmall: {
    fontSize: 9,
  },
});
