import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SPACE, TYPE, useTheme } from '../theme';

interface ScreenHeaderProps {
  title: string;
  eyebrow?: string;
  subtitle?: string;
  right?: React.ReactNode;
}

export function ScreenHeader({ title, eyebrow, subtitle, right }: ScreenHeaderProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top + SPACE.lg }]}>
      <View style={styles.row}>
        <View style={styles.textWrap}>
          {eyebrow ? (
            <Text style={[styles.eyebrow, { color: colors.accent }]}>{eyebrow}</Text>
          ) : null}
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
          {subtitle ? (
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>{subtitle}</Text>
          ) : null}
        </View>
        {right ? <View style={styles.right}>{right}</View> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: SPACE.xl,
    paddingBottom: SPACE.lg,
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
  eyebrow: {
    ...TYPE.eyebrow,
    marginBottom: 6,
  },
  title: {
    ...TYPE.title,
    fontSize: 30,
    lineHeight: 36,
    letterSpacing: -0.6,
  },
  subtitle: {
    ...TYPE.small,
    marginTop: 6,
  },
  right: {
    paddingBottom: 4,
  },
});
