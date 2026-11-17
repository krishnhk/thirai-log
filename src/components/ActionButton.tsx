import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RADIUS, TYPE, useTheme } from '../theme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

interface ActionButtonProps {
  label: string;
  onPress?: () => void;
  icon?: IconName;
  variant?: 'primary' | 'outline' | 'ghost' | 'danger';
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  fullWidth?: boolean;
  /** Tighter padding and label, for buttons placed side by side. */
  compact?: boolean;
}

export function ActionButton({
  label,
  onPress,
  icon,
  variant = 'primary',
  loading,
  disabled,
  style,
  fullWidth,
  compact,
}: ActionButtonProps) {
  const { colors } = useTheme();

  const palette = {
    primary: { bg: colors.primary, border: colors.primary, text: colors.primaryText },
    outline: { bg: 'transparent', border: `${colors.accent}66`, text: colors.accent },
    ghost: { bg: colors.surfaceAlt, border: 'transparent', text: colors.text },
    danger: { bg: `${colors.rose}14`, border: `${colors.rose}55`, text: colors.rose },
  }[variant];

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      disabled={disabled || loading}
      accessibilityRole="button"
      style={[
        styles.button,
        compact && styles.compact,
        fullWidth && styles.fullWidth,
        {
          backgroundColor: palette.bg,
          borderColor: palette.border,
          opacity: disabled ? 0.5 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={palette.text} />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={compact ? 15 : 17} color={palette.text} /> : null}
          <Text
            style={[styles.label, compact && styles.compactLabel, { color: palette.text }]}
            numberOfLines={1}
          >
            {label}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 46,
    paddingHorizontal: 18,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
  },
  fullWidth: {
    width: '100%',
  },
  compact: {
    minHeight: 42,
    paddingHorizontal: 12,
    gap: 6,
  },
  label: {
    ...TYPE.body,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
  compactLabel: {
    fontSize: 13.5,
    letterSpacing: -0.1,
  },
});
