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
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.card,
        padded && styles.padded,
        { backgroundColor: raised ? colors.surfaceAlt : colors.surface, borderColor: colors.borderSoft },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: RADIUS.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  padded: {
    padding: SPACE.lg,
  },
});
