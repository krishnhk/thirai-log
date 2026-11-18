import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { useFonts } from 'expo-font';
import { Righteous_400Regular } from '@expo-google-fonts/righteous';

interface BrandMarkProps {
  /** Height of the logo in logical pixels; sets the size of the title. */
  height?: number;
}

// Navy "thirai" and denim "log", the same blue as the accent used for the year on Home.
const NAVY = '#1A2A42';
const DENIM = '#3B5F94';

/** The in-app logo: just the "thirailog" title in the Righteous rounded display font. */
export function BrandMark({ height = 30 }: BrandMarkProps) {
  // Already loaded at startup, so this is instant. It lets the title be laid out again once the font is ready:
  // Android can otherwise keep the width it measured with the fallback font and cut the last letters off.
  const [fontReady] = useFonts({ Righteous_400Regular });
  const fontSize = Math.round(height * 0.84);
  return (
    <Text
      key={fontReady ? 'font' : 'fallback'}
      numberOfLines={1}
      allowFontScaling={false}
      accessibilityLabel="ThiraiLog"
      style={[
        styles.title,
        {
          color: NAVY,
          fontSize,
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
      thirai
      <Text style={{ color: DENIM }}>log</Text>
    </Text>
  );
}

const styles = StyleSheet.create({
  title: {
    fontFamily: 'Righteous_400Regular',
    flexShrink: 0,
  },
});
