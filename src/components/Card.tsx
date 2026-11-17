import React from 'react';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { RADIUS, SPACE, useTheme } from '../theme';

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
  /** Use a slightly raised surface for nested or highlighted content. */
  raised?: boolean;
}

/** The single container style used across screens. */
export function Card({ children, style, padded = true, raised }: CardProps) {
  const { colors, mode } = useTheme();
  return (
    <LinearGradient
      colors={raised ? [colors.surfaceAlt, colors.surfaceAlt] : [colors.surface, '#FBF8F0']}
      style={[
        styles.card,
        padded && styles.padded,
        {
          borderColor: colors.borderSoft,
          shadowColor: mode === 'light' ? '#1A2A42' : '#000000',
          shadowOpacity: mode === 'light' ? 0.09 : 0.2,
        },
        style,
      ]}
    >
      {children}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: RADIUS.xl,
    borderWidth: StyleSheet.hairlineWidth,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  padded: {
    padding: SPACE.md + 2,
  },
});
