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

export function BrandMark({ height = 30 }: BrandMarkProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.row}>
      <Image
        source={MARK}
        style={{ width: height * ASPECT, height }}
        resizeMode="contain"
        tintColor={colors.accent}
        accessibilityLabel="ThiraiLog"
      />
      <Text
        allowFontScaling={false}
        style={[
          styles.wordmark,
          { color: colors.text, fontSize: Math.round(height * 0.64), lineHeight: height + 2 },
        ]}
      >
        thirai
        <Text style={{ color: colors.accent }}>log</Text>
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
  wordmark: {
    fontWeight: '800',
    letterSpacing: -0.9,
  },
});
