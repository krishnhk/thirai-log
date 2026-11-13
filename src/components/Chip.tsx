import React from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import { TYPE, useTheme } from '../theme';

interface ChipProps {
  label: string;
  active?: boolean;
  onPress?: () => void;
  tint?: string;
}

export function Chip({ label, active, onPress, tint }: ChipProps) {
  const { colors } = useTheme();
  const accent = tint ?? colors.accent;
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      disabled={!onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: Boolean(active) }}
      style={[
        styles.chip,
        {
          backgroundColor: active ? accent : colors.surface,
          borderColor: active ? accent : colors.border,
        },
      ]}
    >
      <Text
        style={[
          styles.label,
          { color: active ? colors.onAccent : colors.textMuted },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  chip: {
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  label: {
    ...TYPE.small,
    fontWeight: '700',
  },
});
