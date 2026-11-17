import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme';
import { BrandMark } from './BrandMark';

// Light theme: the header uses the same ivory as the page.
const LIGHT_HEADER_BG = '#FAF5EA';

/** The logo at the top of each tab screen. */
export function AppHeader() {
  const insets = useSafeAreaInsets();
  const { colors, mode } = useTheme();
  const headerBg = mode === 'light' ? LIGHT_HEADER_BG : colors.background;

  return (
    <View
      style={[styles.header, { paddingTop: insets.top + 10, backgroundColor: headerBg }]}
    >
      <BrandMark height={32} />
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
});
