import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SPACE, useTheme } from '../theme';

interface MonthChartProps {
  counts: number[];
  labels: string[];
  selectedIndex?: number;
  onSelect?: (index: number) => void;
  accent?: string;
  showCounts?: boolean;
}

export function MonthChart({
  counts,
  labels,
  selectedIndex,
  onSelect,
  accent,
  showCounts = true,
}: MonthChartProps) {
  const { colors } = useTheme();
  const tint = accent ?? colors.accent;
  const max = useMemo(() => Math.max(1, ...counts), [counts]);

  return (
    <View style={styles.wrap}>
      <View style={styles.chart}>
        {counts.map((count, index) => {
          const isSelected = selectedIndex === index;
          const active = count > 0;
          const height = count > 0 ? Math.max(10, (count / max) * 72) : 4;
          const content = (
            <View style={styles.column}>
              {showCounts && count > 0 ? (
                <Text style={[styles.count, { color: colors.textMuted }]}>{count}</Text>
              ) : (
                <View style={styles.countSpacer} />
              )}
              <View
                style={[
                  styles.bar,
                  {
                    height,
                    backgroundColor: active ? tint : colors.surfaceAlt,
                    opacity: active ? (selectedIndex === undefined || isSelected ? 1 : 0.72) : 1,
                    borderWidth: isSelected ? 1.5 : 0,
                    borderColor: colors.textMuted,
                  },
                ]}
              />
              <Text
                style={[
                  styles.label,
                  {
                    color: isSelected ? tint : active ? colors.textMuted : colors.textDim,
                    fontWeight: isSelected ? '800' : '600',
                  },
                ]}
              >
                {labels[index]}
              </Text>
            </View>
          );

          if (onSelect) {
            return (
              <TouchableOpacity
                key={`${labels[index]}-${index}`}
                style={styles.pressable}
                activeOpacity={0.7}
                onPress={() => onSelect(index)}
              >
                {content}
              </TouchableOpacity>
            );
          }

          return (
            <View key={`${labels[index]}-${index}`} style={styles.pressable}>
              {content}
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: SPACE.sm,
  },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 3,
  },
  pressable: {
    flex: 1,
    alignItems: 'center',
  },
  column: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    width: '100%',
  },
  count: {
    fontSize: 9,
    fontWeight: '700',
    marginBottom: 3,
    height: 12,
  },
  countSpacer: {
    height: 12,
    marginBottom: 3,
  },
  bar: {
    width: '72%',
    borderRadius: 5,
    minHeight: 4,
  },
  label: {
    fontSize: 9,
    marginTop: 6,
    letterSpacing: 0.2,
  },
});
