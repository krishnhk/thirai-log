import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RADIUS, SPACE, TYPE, useTheme } from '../theme';
import { ActionButton } from './ActionButton';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

interface EmptyStateProps {
  icon?: IconName;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  compact?: boolean;
}

export function EmptyState({
  icon = 'sparkles-outline',
  title,
  message,
  actionLabel,
  onAction,
  compact,
}: EmptyStateProps) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.container,
        compact && styles.compact,
        { backgroundColor: colors.surface, borderColor: colors.borderSoft },
      ]}
    >
      <View style={[styles.iconWrap, { backgroundColor: colors.accentSoft }]}>
        <Ionicons name={icon} size={compact ? 18 : 22} color={colors.accent} />
      </View>
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      {message ? (
        <Text style={[styles.message, { color: colors.textMuted }]}>{message}</Text>
      ) : null}
      {actionLabel && onAction ? (
        <ActionButton label={actionLabel} onPress={onAction} style={styles.action} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: SPACE.xl,
    paddingHorizontal: SPACE.lg,
    borderRadius: RADIUS.lg,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
  },
  compact: {
    paddingVertical: SPACE.lg,
    paddingHorizontal: SPACE.lg,
  },
  iconWrap: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACE.md,
  },
  title: {
    ...TYPE.heading,
    textAlign: 'center',
  },
  message: {
    ...TYPE.small,
    textAlign: 'center',
    marginTop: SPACE.sm,
    maxWidth: 280,
  },
  action: {
    marginTop: SPACE.md,
    minHeight: 42,
    paddingHorizontal: SPACE.xl,
  },
});
