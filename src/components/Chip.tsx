import React from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import { TYPE, useTheme } from '../theme';

interface ChipProps {
  label: string;
  active?: boolean;
  onPress?: () => void;
  tint?: string;
  /** Reduced height and padding for dense filter rows. */
  compact?: boolean;
}

export function Chip({ label, active, onPress, tint, compact }: ChipProps) {
  const { colors } = useTheme();
  const accent = tint ?? colors.primary;
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      disabled={!onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: Boolean(active) }}
      style={[ 
        styles.chip,
        compact && styles.chipCompact,
        {
          backgroundColor: active ? accent : colors.surface,
          borderColor: active ? accent : colors.border,
        },
      ]}
    >
      <Text
        style={[
          styles.label,
          compact && styles.labelCompact,
          { color: active ? colors.primaryText : colors.textMuted },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  chip: {
    minHeight: 32,
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  chipCompact: {
    minHeight: 26,
    paddingHorizontal: 10,
  },
  label: {
    ...TYPE.small,
    fontWeight: '700',
  },
  labelCompact: {
    fontSize: 11.5,
    lineHeight: 15,
  },
});
