import React, { useState } from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme';

interface MonthTrendProps {
  /** One number per month, for example the movies watched. */
  values: number[];
  labels: string[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  color: string;
  /** Height of the line area. */
  height?: number;
}

/**
 * A thin trend line through the twelve months with a dot on the selected one, and the month names
 * underneath (tap one to select it). The line is drawn from small rotated Views, so no SVG is needed.
 */
export function MonthTrend({ values, labels, selectedIndex, onSelect, color, height = 40 }: MonthTrendProps) {
  const { colors } = useTheme();
  const [width, setWidth] = useState(0);

  const max = Math.max(1, ...values);
  const count = values.length;
  const padding = 7;
  const point = (index: number) => ({
    x: padding + (index * (width - padding * 2)) / Math.max(1, count - 1),
    y: height - 6 - (values[index] / max) * (height - 14),
  });

  const segments = [];
  if (width > 0) {
    for (let index = 0; index < count - 1; index += 1) {
      const from = point(index);
      const to = point(index + 1);
      const length = Math.hypot(to.x - from.x, to.y - from.y);
      const angle = (Math.atan2(to.y - from.y, to.x - from.x) * 180) / Math.PI;
      segments.push(
        <View
          key={index}
          style={[
            styles.segment,
            {
              width: length + 1,
              left: (from.x + to.x) / 2 - (length + 1) / 2,
              top: (from.y + to.y) / 2 - 1.1,
              backgroundColor: color,
              transform: [{ rotate: `${angle}deg` }],
            },
          ]}
        />
      );
    }
  }
  const selected = width > 0 ? point(selectedIndex) : null;

  return (
    <View>
      <View style={{ height }} onLayout={(event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width)}>
        {segments}
        {selected ? (
          <View
            style={[
              styles.dot,
              { left: selected.x - 6, top: selected.y - 6, backgroundColor: colors.primary, borderColor: colors.surface },
            ]}
          />
        ) : null}
      </View>
      <View style={styles.labels}>
        {labels.map((label, index) => {
          const active = index === selectedIndex;
          return (
            <Pressable
              key={`${label}-${index}`}
              onPress={() => onSelect(index)}
              hitSlop={{ top: 8, bottom: 8 }}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`${label}: ${values[index]}`}
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
  segment: {
    position: 'absolute',
    height: 2.2,
    borderRadius: 1.1,
  },
  dot: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
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
