import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
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
    <View
      style={[
        styles.card,
        padded && styles.padded,
        {
          backgroundColor: raised ? colors.surfaceAlt : colors.surface,
          borderColor: colors.borderSoft,
          shadowColor: mode === 'light' ? '#12396A' : '#000000',
          shadowOpacity: mode === 'light' ? 0.06 : 0.2,
        },
        style,
      ]}
    >
      {children}
    </View>
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
