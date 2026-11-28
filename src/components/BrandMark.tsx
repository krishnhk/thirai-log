import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { useFonts } from 'expo-font';
import { Righteous_400Regular } from '@expo-google-fonts/righteous';
import { useTheme } from '../theme';

interface BrandMarkProps {
  /** Height of the logo in logical pixels; sets the size of the title. */
  height?: number;
}

// The whole title in the accent colour of the current theme (cinema red).

/** The in-app logo: just the "thirailog" title in the Righteous rounded display font. */
export function BrandMark({ height = 30 }: BrandMarkProps) {
  // Already loaded at startup, so this is instant. It lets the title be laid out again once the font is ready:
  // Android can otherwise keep the width it measured with the fallback font and cut the last letters off.
  const [fontReady] = useFonts({ Righteous_400Regular });
  const { colors } = useTheme();
  const fontSize = Math.round(height * 0.84);
  return (
    <Text
      key={fontReady ? 'font' : 'fallback'}
      allowFontScaling={false}
      accessibilityLabel="ThiraiLog"
      style={[
        styles.title,
        {
          color: colors.accent,
          fontSize,
          // Fixed width with room to spare: Android can measure the text with the fallback font and then
          // cut it off ("thirail...") once the wider rounded font loads. The title is left-aligned, so the
          // extra space is not visible.
          width: Math.round(fontSize * 6),
          // Tall enough line box that Android does not clip the descender of the "g".
          lineHeight: Math.round(fontSize * 1.7),
          // Keep Android's font padding (the font has a deep descender) and add a little room at the bottom and
          // right, so the tail of the "g" is never cut off.
          includeFontPadding: true,
          paddingBottom: 4,
          paddingRight: 8,
        },
      ]}
    >
      thirailog
    </Text>
  );
}

const styles = StyleSheet.create({
  title: {
    fontFamily: 'Righteous_400Regular',
    flexShrink: 0,
  },
});
