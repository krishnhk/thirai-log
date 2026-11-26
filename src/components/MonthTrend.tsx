import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme';

interface MonthTrendProps {
  /** One number per month, for example the movies watched. */
  values: number[];
  labels: string[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  /** Colour of the bars that are not picked (a light shade of the accent). */
  color: string;
  /** Height of the bar area. */
  height?: number;
}

const BAR_WIDTH = 18;
const MIN_BAR = 4;

/**
 * "Rounded bars": one soft pill-shaped bar per month, the picked month in the accent colour. Tap a bar
 * (anywhere in its column) or a month name to pick a month. No axis and no gridlines.
 */
export function MonthTrend({ values, labels, selectedIndex, onSelect, color, height = 92 }: MonthTrendProps) {
  const { colors } = useTheme();
  const max = Math.max(1, ...values);

  return (
    <View>
      <View style={[styles.bars, { height }]}>
        {values.map((value, index) => {
          const active = index === selectedIndex;
          const barHeight = Math.max(MIN_BAR, (value / max) * (height - 6));
          return (
            <Pressable
              key={`bar-${index}`}
              onPress={() => onSelect(index)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`${labels[index]}: ${value}`}
              style={styles.column}
            >
              <View
                style={{
                  width: BAR_WIDTH,
                  height: barHeight,
                  borderRadius: BAR_WIDTH / 2,
                  backgroundColor: active ? colors.accent : color,
                  opacity: active ? 1 : 0.6,
                }}
              />
            </Pressable>
          );
        })}
      </View>

      <View style={styles.labels}>
        {labels.map((label, index) => {
          const active = index === selectedIndex;
          return (
            <Pressable
              key={`${label}-${index}`}
              onPress={() => onSelect(index)}
              hitSlop={{ top: 8, bottom: 8 }}
              accessible={false}
              style={styles.labelCell}
            >
              <Text
                style={[
                  styles.label,
                  { color: active ? colors.text : colors.textMuted, fontWeight: active ? '800' : '600' },
                ]}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  column: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  labels: {
    flexDirection: 'row',
    marginTop: 4,
  },
  labelCell: {
    flex: 1,
    alignItems: 'center',
  },
  label: {
    fontSize: 10.5,
    lineHeight: 13,
  },
});
