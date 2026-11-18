import React from 'react';
import { StyleSheet, Text } from 'react-native';

interface BrandMarkProps {
  /** Height of the logo in logical pixels; sets the size of the title. */
  height?: number;
}

// Navy "thirai" and denim "log", the same blue as the accent used for the year on Home.
const NAVY = '#1A2A42';
const DENIM = '#3B5F94';

/** The in-app logo: just the "thirailog" title in the Righteous rounded display font. */
export function BrandMark({ height = 30 }: BrandMarkProps) {
  const fontSize = Math.round(height * 0.84);
  return (
    <Text
      allowFontScaling={false}
      accessibilityLabel="ThiraiLog"
      style={[
        styles.title,
        {
          color: NAVY,
          fontSize,
          // Tall enough line box that Android does not clip the descender of the "g".
          lineHeight: Math.round(fontSize * 1.6),
          // Centre the glyphs inside their line box, so the title lines up with the header.
          includeFontPadding: false,
          textAlignVertical: 'center',
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
    letterSpacing: 0.3,
  },
});
