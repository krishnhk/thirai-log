import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';

interface RatingStarsProps {
  value?: number;
  size?: number;
  onChange?: (value: number) => void;
  showValue?: boolean;
}

export function RatingStars({ value = 0, size = 14, onChange, showValue }: RatingStarsProps) {
  const { colors } = useTheme();
  const interactive = Boolean(onChange);

  return (
    <View style={styles.row}>
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = value >= star;
        const half = !filled && value >= star - 0.5;
        const icon = filled ? 'star' : half ? 'star-half' : 'star-outline';
        const node = (
          <Ionicons
            name={icon}
            size={size}
            color={filled || half ? colors.star : colors.textDim}
          />
        );
        if (!interactive) {
          return (
            <View key={star} style={styles.star}>
              {node}
            </View>
          );
        }
        return (
          <TouchableOpacity
            key={star}
            style={styles.star}
            activeOpacity={0.6}
            onPress={() => onChange?.(value === star ? 0 : star)}
          >
            {node}
          </TouchableOpacity>
        );
      })}
      {showValue && value > 0 ? (
        <Text style={[styles.value, { color: colors.textMuted }]}>{value.toFixed(1)}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  star: {
    paddingVertical: 1,
  },
  value: {
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 4,
  },
});
