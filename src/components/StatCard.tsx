import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RADIUS, SPACE, TYPE, useTheme } from '../theme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

interface StatCardProps {
  label: string;
  value: string | number;
  icon: IconName;
  tint?: string;
  hint?: string;
  /** Soft editorial card tone. Falls back to a plain surface card. */
  tone?: 'blue' | 'mint' | 'coral' | 'sage';
  /** Shorter card with tighter padding for dense dashboards. */
  compact?: boolean;
  /** Optional small status badge in the lower-right corner. */
  badge?: IconName;
}

export function StatCard({ label, value, icon, tint, hint, tone, compact, badge }: StatCardProps) {
  const { colors } = useTheme();

  if (tone) {
    const palette =
      tone === 'blue' || tone === 'coral'
        ? { bg: colors.coralSoft, ink: colors.coralInk, mark: colors.coral }
        : { bg: colors.sageSoft, ink: colors.sageInk, mark: colors.sage };

    return (
      <View
        style={[
          styles.card,
          styles.toneCard,
          compact && styles.cardCompact,
          compact && styles.toneCardCompact,
          { backgroundColor: palette.bg },
        ]}
      >
        <Ionicons
          name={icon}
          size={compact ? 46 : 72}
          color={palette.mark}
          style={[styles.watermark, compact && styles.watermarkCompact]}
        />
        <Text style={[styles.toneLabel, { color: palette.ink }]} numberOfLines={2}>
          {label}
        </Text>
        <Text
          style={[styles.value, compact && styles.valueCompact, { color: colors.text }]}
          numberOfLines={1}
        >
          {value}
        </Text>
        {hint ? (
          <Text
            style={[styles.toneHint, compact && styles.toneHintCompact, { color: palette.ink }]}
            numberOfLines={1}
          >
            {hint}
          </Text>
        ) : null}
        {badge ? (
          <View style={[styles.badge, { backgroundColor: `${palette.mark}24` }]}>
            <Ionicons name={badge} size={13} color={palette.mark} />
          </View>
        ) : null}
      </View>
    );
  }

  const accent = tint ?? colors.accent;
  return (
    <View
      style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.borderSoft }]}
    >
      <View style={[styles.iconWrap, { backgroundColor: `${accent}1F` }]}>
        <Ionicons name={icon} size={16} color={accent} />
      </View>
      <Text style={[styles.value, { color: colors.text }]} numberOfLines={1}>
        {value}
      </Text>
      <Text style={[styles.label, { color: colors.textMuted }]} numberOfLines={2}>
        {label}
      </Text>
      {hint ? (
        <Text style={[styles.hint, { color: accent }]} numberOfLines={1}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 0,
    padding: SPACE.md + 2,
    borderRadius: RADIUS.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'transparent',
    overflow: 'hidden',
  },
  toneCard: {
    minHeight: 112,
    justifyContent: 'flex-start',
  },
  cardCompact: {
    padding: 11,
    borderRadius: RADIUS.xl,
  },
  toneCardCompact: {
    minHeight: 86,
    justifyContent: 'flex-start',
  },
  watermark: {
    position: 'absolute',
    right: -18,
    bottom: -16,
    opacity: 0.13,
  },
  watermarkCompact: {
    right: -8,
    bottom: -12,
    opacity: 0.14,
  },
  toneLabel: {
    ...TYPE.eyebrow,
    fontSize: 10,
    lineHeight: 13,
    letterSpacing: 1,
    opacity: 0.92,
  },
  toneHint: {
    ...TYPE.caption,
    fontSize: 11.5,
    fontWeight: '700',
    marginTop: SPACE.sm,
    opacity: 0.92,
  },
  toneHintCompact: {
    fontSize: 12,
    lineHeight: 15,
    marginTop: 1,
  },
  badge: {
    position: 'absolute',
    right: 10,
    bottom: 10,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACE.sm,
  },
  value: {
    ...TYPE.number,
    marginTop: SPACE.xs,
  },
  valueCompact: {
    fontSize: 30,
    lineHeight: 33,
    letterSpacing: -0.8,
    marginTop: 2,
  },
  label: {
    ...TYPE.caption,
    marginTop: 2,
  },
  hint: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 6,
  },
});
