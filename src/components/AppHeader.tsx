import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TYPE, useTheme } from '../theme';
import { BrandMark } from './BrandMark';

// Light theme: the header uses the same ivory as the page.
const LIGHT_HEADER_BG = '#FAF5EA';
// Space between the status bar and the header content: more on pages with their own name, less on Home.
const PAGE_TOP_GAP = 22;
const HOME_TOP_GAP = 10;

interface AppHeaderProps {
  /** Page name. Without it the header shows the ThiraiLog title (used on Home only). */
  title?: string;
  /** One line under the page name. */
  subtitle?: string;
}

/** The header at the top of each tab screen: the ThiraiLog title on Home, the page name elsewhere. */
export function AppHeader({ title, subtitle }: AppHeaderProps) {
  const insets = useSafeAreaInsets();
  const { colors, mode } = useTheme();
  const headerBg = mode === 'light' ? LIGHT_HEADER_BG : colors.background;

  return (
    <View style={[styles.header, { paddingTop: insets.top + (title ? PAGE_TOP_GAP : HOME_TOP_GAP), backgroundColor: headerBg }]}>
      {title ? (
        <View style={styles.titleBlock}>
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
          {subtitle ? <Text style={[styles.subtitle, { color: colors.textMuted }]}>{subtitle}</Text> : null}
        </View>
      ) : (
        <BrandMark height={32} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 54,
  },
  titleBlock: {
    paddingBottom: 6,
  },
  title: {
    ...TYPE.title,
    fontSize: 26,
    lineHeight: 31,
  },
  subtitle: {
    ...TYPE.small,
    marginTop: 2,
  },
});
