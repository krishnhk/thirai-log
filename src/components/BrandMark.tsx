import React from 'react';
import { Image, StyleSheet, View } from 'react-native';

// The ThiraiLog logo: reel mark plus "thirailog" wordmark, on one line.
const LOGO = require('../../assets/logo/app-logo-horizontal.png');
// Source aspect ratio of app-logo-horizontal.png.
const ASPECT = 808 / 260;

interface BrandMarkProps {
  /** Height of the logo in logical pixels. */
  height?: number;
}

export function BrandMark({ height = 30 }: BrandMarkProps) {
  return (
    <View style={styles.row}>
      <Image
        source={LOGO}
        style={{ width: height * ASPECT, height }}
        resizeMode="contain"
        accessibilityLabel="ThiraiLog"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
