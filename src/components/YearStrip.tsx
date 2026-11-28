import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NUMBER_FONT, useTheme } from '../theme';

interface Props {
  /** Small caps label of the left tile, such as WATCHED or VISITS. */
  label: string;
  /** The figure in the left tile. */
  value: React.ReactNode;
  /** Shown before the figure, for example the progress ring. */
  lead?: React.ReactNode;
  year: number;
  canPrev: boolean;
  canNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  accessibilityLabel?: string;
}

/** Two tiles under the page title: the count on the left, the year with its arrows on the right. */
export function YearStrip({ label, value, lead, year, canPrev, canNext, onPrev, onNext, accessibilityLabel }: Props) {
  const { colors } = useTheme();
  const tile = { backgroundColor: colors.surface, borderColor: colors.borderSoft };
  const arrow = (dir: 'back' | 'forward', enabled: boolean, onPress: () => void) => (
    <Pressable
      onPress={onPress}
      disabled={!enabled}
      accessibilityRole="button"
      accessibilityLabel={dir === 'back' ? 'Previous year' : 'Next year'}
      hitSlop={6}
      style={({ pressed }) => [
        styles.arrow,
        { backgroundColor: colors.coralSoft },
        (pressed || !enabled) && { opacity: 0.4 },
      ]}
    >
      <Ionicons name={dir === 'back' ? 'chevron-back' : 'chevron-forward'} size={16} color={colors.accent} />
    </Pressable>
  );

  return (
    <View style={styles.row}>
      <View style={[styles.tile, styles.countTile, tile]} accessible accessibilityLabel={accessibilityLabel}>
        {lead}
        <View style={styles.centered}>
          <Text style={[styles.label, { color: colors.textMuted }]}>{label}</Text>
          <Text style={[styles.value, { color: colors.text }]}>{value}</Text>
        </View>
      </View>
      <View style={[styles.tile, styles.yearTile, tile]}>
        {arrow('back', canPrev, onPrev)}
        <Text style={[styles.year, { color: colors.text }]} accessibilityRole="header">
          {year}
        </Text>
        {arrow('forward', canNext, onNext)}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 10,
  },
  tile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 52,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  // Same width on every screen, so the strip does not change shape between the Diary and the Bucket list.
  countTile: {
    width: 132,
    justifyContent: 'center',
  },
  yearTile: {
    flex: 1,
    justifyContent: 'space-between',
  },
  centered: {
    alignItems: 'center',
  },
  label: {
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 1,
    textAlign: 'center',
  },
  value: {
    fontFamily: NUMBER_FONT,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '400',
    fontVariant: ['tabular-nums'],
    textAlign: 'center',
  },
  year: {
    fontFamily: NUMBER_FONT,
    fontSize: 18,
    fontWeight: '400',
    fontVariant: ['tabular-nums'],
  },
  arrow: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
