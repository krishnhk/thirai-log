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
}: ActionButtonProps) {
  const { colors } = useTheme();

  const palette = {
    primary: { bg: colors.accent, border: colors.accent, text: colors.onAccent },
    outline: { bg: 'transparent', border: colors.border, text: colors.text },
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
          {icon ? <Ionicons name={icon} size={17} color={palette.text} /> : null}
          <Text style={[styles.label, { color: palette.text }]}>{label}</Text>
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
    minHeight: 48,
    paddingHorizontal: 20,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
  },
  fullWidth: {
    width: '100%',
  },
  label: {
    ...TYPE.body,
    fontWeight: '700',
  },
});
