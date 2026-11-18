import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

// The ThiraiLog lens mark in two parts (lid and iris), so each can have its own colour,
// plus a live wordmark in the Righteous rounded display font.
const LID = require('../../assets/logo/mark-lid.png');
const IRIS = require('../../assets/logo/mark-iris.png');
// Source aspect ratio of the mark images.
const ASPECT = 152 / 121;

interface BrandMarkProps {
  /** Height of the logo in logical pixels. */
  height?: number;
}

// Navy lid and "thirai", lighter denim iris and "log".
const NAVY = '#1A2A42';
const DENIM_LIGHT = '#6E96CE';

export function BrandMark({ height = 30 }: BrandMarkProps) {
  const width = height * ASPECT;

  return (
    <View style={styles.row}>
      <View style={{ width, height }} accessible accessibilityLabel="ThiraiLog">
        <Image source={LID} style={[styles.layer, { width, height }]} resizeMode="contain" tintColor={NAVY} />
        <Image source={IRIS} style={[styles.layer, { width, height }]} resizeMode="contain" tintColor={DENIM_LIGHT} />
      </View>
      <Text
        allowFontScaling={false}
        style={[
          styles.wordmark,
          {
            color: NAVY,
            fontSize: Math.round(height * 0.64),
            // Line box slightly taller than the font size, so the text centres on the mark.
            lineHeight: Math.round(height * 0.64 * 1.2),
            // Centre the glyphs inside their line box, so the wordmark lines up with the mark and button.
            includeFontPadding: false,
            textAlignVertical: 'center',
          },
        ]}
      >
        thirai
        <Text style={{ color: DENIM_LIGHT }}>log</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  layer: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  wordmark: {
    fontFamily: 'Righteous_400Regular',
    letterSpacing: 0.3,
  },
});
