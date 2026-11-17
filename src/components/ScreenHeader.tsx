import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SPACE, TYPE, useTheme } from '../theme';

interface ScreenHeaderProps {
  title: string;
  eyebrow?: string;
  subtitle?: string;
  right?: React.ReactNode;
  /** Tighter header for dense screens such as the diary. */
  compact?: boolean;
}

export function ScreenHeader({ title, eyebrow, subtitle, right, compact }: ScreenHeaderProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        compact && styles.containerCompact,
        { paddingTop: insets.top + (compact ? SPACE.sm : SPACE.md) },
      ]}
    >
      <View style={styles.row}>
        <View style={styles.textWrap}>
          {eyebrow ? (
            <View style={styles.eyebrowRow}>
              <View style={[styles.tick, { backgroundColor: colors.gold }]} />
              <Text
                style={[styles.eyebrow, compact && styles.eyebrowCompact, { color: colors.accent }]}
              >
                {eyebrow}
              </Text>
            </View>
          ) : null}
          <Text style={[styles.title, compact && styles.titleCompact, { color: colors.text }]}>
            {title}
          </Text>
          {subtitle ? (
            <Text
              style={[styles.subtitle, compact && styles.subtitleCompact, { color: colors.textMuted }]}
            >
              {subtitle}
            </Text>
          ) : null}
        </View>
        {right ? <View style={styles.right}>{right}</View> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: SPACE.lg,
    paddingBottom: SPACE.md,
  },
  containerCompact: {
    paddingHorizontal: SPACE.lg,
    paddingBottom: SPACE.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: SPACE.md,
  },
  textWrap: {
    flex: 1,
  },
  eyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  tick: {
    width: 14,
    height: 2,
    borderRadius: 1,
  },
  eyebrow: {
    ...TYPE.eyebrow,
  },
  eyebrowCompact: {
    fontSize: 9,
    letterSpacing: 1.3,
  },
  title: {
    ...TYPE.title,
    fontSize: 26,
    lineHeight: 31,
    letterSpacing: -0.5,
  },
  titleCompact: {
    fontSize: 22,
    lineHeight: 26,
    letterSpacing: -0.4,
  },
  subtitle: {
    ...TYPE.small,
    marginTop: 4,
  },
  subtitleCompact: {
    fontSize: 11.5,
    lineHeight: 15,
    marginTop: 2,
  },
  right: {
    paddingBottom: 4,
  },
});
