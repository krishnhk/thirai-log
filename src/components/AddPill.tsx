import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';

interface Props {
  /** The words on the button, such as "Log film" or "Add film". */
  label: string;
  onPress: () => void;
}

/** The add button of the Diary and the Bucket list: a labelled pill floating at the bottom right, above the tab bar. */
export function AddPill({ label, onPress }: Props) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.pill,
        { backgroundColor: colors.accent, shadowColor: colors.accent },
        pressed && { opacity: 0.85, transform: [{ scale: 0.96 }] },
      ]}
    >
      <Ionicons name="add" size={20} color={colors.onAccent} />
      <Text style={[styles.label, { color: colors.onAccent }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingLeft: 14,
    paddingRight: 18,
    borderRadius: 999,
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
    zIndex: 10,
  },
  label: {
    fontSize: 14,
    fontWeight: '800',
  },
});
