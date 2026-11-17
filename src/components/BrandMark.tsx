import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme';

// The ThiraiLog reel mark, tinted to the current accent, plus a live wordmark.
const MARK = require('../../assets/logo/mark.png');
// Source aspect ratio of mark.png.
const ASPECT = 152 / 121;

interface BrandMarkProps {
  /** Height of the logo in logical pixels. */
  height?: number;
}

// Light theme: "thirai" dark navy, "log" a lighter blue. The mark matches "log".
const LIGHT_THIRAI_DARK = '#1A2A42';
const LIGHT_LOG_LIGHT = '#6E96CE';

export function BrandMark({ height = 30 }: BrandMarkProps) {
  const { colors, mode } = useTheme();
  const light = mode === 'light';
  const markTint = light ? LIGHT_LOG_LIGHT : colors.accent;
  const wordColor = light ? LIGHT_THIRAI_DARK : colors.text;
  const logColor = light ? LIGHT_LOG_LIGHT : colors.accent;

  const logo = (
    <View style={styles.row}>
      <Image
        source={MARK}
        style={{ width: height * ASPECT, height }}
        resizeMode="contain"
        tintColor={markTint}
        accessibilityLabel="ThiraiLog"
      />
      <Text
        allowFontScaling={false}
        style={[
          styles.wordmark,
          {
            color: wordColor,
            fontSize: Math.round(height * 0.64),
            // Line box equal to the font size, so the text centres on the mark instead of sitting low.
            lineHeight: Math.round(height * 0.64 * 1.2),
            // Centre the glyphs inside their line box, so the wordmark lines up with the mark and button.
            includeFontPadding: false,
            textAlignVertical: 'center',
          },
        ]}
      >
        thirai
        <Text style={{ color: logColor }}>log</Text>
      </Text>
    </View>
  );

  return logo;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  wordmark: {
    fontWeight: '800',
    letterSpacing: -0.9,
  },
});
