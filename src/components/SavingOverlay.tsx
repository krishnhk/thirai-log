import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { RADIUS, useTheme } from '../theme';

interface SavingOverlayProps {
  visible: boolean;
  /** What is happening, for example "Saving…" or "Deleting…". */
  label?: string;
}

/**
 * Covers the screen while something is being saved, so the form cannot be changed or tapped again
 * and it is clear that the data is being written.
 */
export function SavingOverlay({ visible, label = 'Saving…' }: SavingOverlayProps) {
  const { colors } = useTheme();
  if (!visible) return null;
  return (
    <View
      style={[StyleSheet.absoluteFill, styles.overlay, { backgroundColor: colors.overlay }]}
      accessibilityViewIsModal
      accessibilityLiveRegion="polite"
      accessibilityLabel={label}
    >
      <View style={[styles.card, { backgroundColor: colors.background, borderColor: colors.borderSoft }]}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    zIndex: 1000,
    elevation: 1000,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    minWidth: 150,
    alignItems: 'center',
    gap: 12,
    paddingVertical: 22,
    paddingHorizontal: 28,
    borderRadius: RADIUS.xl,
    borderWidth: StyleSheet.hairlineWidth,
  },
  label: {
    fontSize: 15,
    fontWeight: '800',
  },
});
