import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SPACE, useTheme } from '../theme';

interface MonthChartProps {
  counts: number[];
  labels: string[];
  selectedIndex?: number;
  onSelect?: (index: number) => void;
  accent?: string;
  /** Colour used for the selected column, defaults to the accent. */
  selectedColor?: string;
  showCounts?: boolean;
  /** Lower bars and tighter labels for dashboard cards. */
  compact?: boolean;
  /** Text shown above a bar, for example a short amount such as 1.2k. Defaults to the number. */
  formatValue?: (value: number) => string;
}

export function MonthChart({
  counts,
  labels,
  selectedIndex,
  onSelect,
  accent,
  selectedColor,
  showCounts = true,
  compact,
  formatValue,
}: MonthChartProps) {
  const { colors } = useTheme();
  const tint = accent ?? colors.accent;
  const highlight = selectedColor ?? tint;
  const max = useMemo(() => Math.max(1, ...counts), [counts]);
  const maxBarHeight = compact ? 30 : 76;

  return (
    <View style={[styles.wrap, compact && styles.wrapCompact]}>
      <View style={styles.chart}>
        {compact ? (
          <View
            pointerEvents="none"
            style={[styles.baseline, { backgroundColor: colors.border }]}
          />
        ) : null}
        {counts.map((count, index) => {
          const isSelected = selectedIndex === index;
          const active = count > 0;
          const height = count > 0 ? Math.max(compact ? 9 : 12, (count / max) * maxBarHeight) : 0;
          const content = (
            <View style={styles.column}>
              {showCounts && count > 0 && (isSelected || !compact) ? (
                <Text
                  style={[
                    styles.count,
                    compact && styles.countCompact,
                    {
                      color: isSelected ? colors.text : colors.textMuted,
                      fontWeight: isSelected ? '800' : '600',
                    },
                  ]}
                >
                  {formatValue ? formatValue(count) : count}
                </Text>
              ) : (
                <View style={[styles.countSpacer, compact && styles.countSpacerCompact]} />
              )}
              <View
                style={[
                  styles.bar,
                  !active && styles.barEmpty,
                  {
                    height,
                    backgroundColor: active
                      ? isSelected
                        ? highlight
                        : tint
                      : 'transparent',
                    opacity: active ? (isSelected ? 1 : 0.38) : 1,
                  },
                ]}
              />
              <Text
                style={[
                  styles.label,
                  compact && styles.labelCompact,
                  {
                    color: isSelected ? colors.text : colors.textMuted,
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
  wrapCompact: {
    marginTop: 6,
  },
  baseline: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 19,
    height: StyleSheet.hairlineWidth * 2,
  },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
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
    fontSize: 9.5,
    fontWeight: '700',
    marginBottom: 4,
    height: 12,
    fontVariant: ['tabular-nums'],
  },
  countSpacer: {
    height: 12,
    marginBottom: 4,
  },
  countCompact: {
    fontSize: 9,
    height: 10,
    marginBottom: 4,
  },
  countSpacerCompact: {
    height: 10,
    marginBottom: 4,
  },
  bar: {
    width: '68%',
    borderRadius: 6,
    minHeight: 4,
  },
  barEmpty: {
    minHeight: 0,
  },
  label: {
    fontSize: 9.5,
    marginTop: 7,
    letterSpacing: 0.1,
  },
  labelCompact: {
    fontSize: 10.5,
    lineHeight: 13,
    marginTop: 6,
    letterSpacing: 0.1,
  },
});
