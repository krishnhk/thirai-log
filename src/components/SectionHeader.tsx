import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RADIUS, SERIF, SPACE, useTheme } from '../theme';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function SectionHeader({ title, subtitle, actionLabel, onAction }: SectionHeaderProps) {
  const { colors } = useTheme();
  return (
    <View style={styles.row}>
      <View style={styles.titleWrap}>
        <View style={styles.titleRow}>
          <View style={[styles.tick, { backgroundColor: colors.gold }]} />
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
        </View>
        {subtitle ? (
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>{subtitle}</Text>
        ) : null}
      </View>
      {actionLabel && onAction ? (
        <TouchableOpacity
          style={[styles.action, { backgroundColor: colors.accentSoft }]}
          onPress={onAction}
          activeOpacity={0.7}
        >
          <Text style={[styles.actionLabel, { color: colors.accent }]}>{actionLabel}</Text>
          <Ionicons name="chevron-forward" size={13} color={colors.accent} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: SPACE.sm + 2,
    paddingHorizontal: SPACE.lg,
    gap: SPACE.sm,
  },
  titleWrap: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  tick: {
    width: 3,
    height: 15,
    borderRadius: 2,
  },
  title: {
    fontFamily: SERIF,
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 11,
    marginTop: 1,
    marginLeft: 10,
    fontWeight: '500',
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.pill,
  },
  actionLabel: {
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
});
