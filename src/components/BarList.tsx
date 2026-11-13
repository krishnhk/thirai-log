import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SPACE, useTheme } from '../theme';

export interface BarItem {
  label: string;
  value: number;
}

interface BarListProps {
  items: BarItem[];
  color?: string;
  maxRows?: number;
  unit?: string;
  showPercent?: boolean;
}

export function BarList({ items, color, maxRows = 8, unit, showPercent }: BarListProps) {
  const { colors } = useTheme();
  const tint = color ?? colors.accent;
  const max = useMemo(
    () => Math.max(1, ...items.map((item) => item.value)),
    [items]
  );
  const total = useMemo(
    () => items.reduce((sum, item) => sum + item.value, 0),
    [items]
  );

  return (
    <View style={styles.wrap}>
      {items.slice(0, maxRows).map((item) => {
        const pct = Math.max(4, (item.value / max) * 100);
        const share = total > 0 ? Math.round((item.value / total) * 100) : 0;
        return (
          <View key={item.label} style={styles.row}>
            <Text
              style={[styles.label, { color: colors.textMuted }]}
              numberOfLines={1}
            >
              {item.label}
            </Text>
            <View style={[styles.track, { backgroundColor: colors.surfaceAlt }]}>
              <View
                style={[
                  styles.fill,
                  { width: `${pct}%`, backgroundColor: tint },
                ]}
              />
            </View>
            <Text style={[styles.value, { color: colors.text }]}>
              {showPercent ? `${share}%` : `${item.value}${unit ?? ''}`}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.sm,
  },
  label: {
    width: 88,
    fontSize: 12,
    fontWeight: '600',
  },
  track: {
    flex: 1,
    height: 8,
    borderRadius: 999,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 999,
  },
  value: {
    minWidth: 34,
    textAlign: 'right',
    fontSize: 12,
    fontWeight: '700',
  },
});
