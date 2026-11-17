import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RADIUS, TYPE, useTheme } from '../theme';
import type { Companion } from '../lib/library';

interface CompanionPickerProps {
  /** Nothing is pre-selected: undefined means the question has not been answered. */
  value?: Companion;
  onChange: (value: Companion) => void;
  /** Validation message, shown in red under the options. */
  error?: string | null;
  /** Neutral helper line under the options, for example why nothing is selected. */
  hint?: string | null;
}

const OPTIONS: { value: Companion; label: string; icon: React.ComponentProps<typeof Ionicons>['name'] }[] = [
  { value: 'alone', label: 'Solo', icon: 'person-outline' },
  { value: 'company', label: 'Group', icon: 'people-outline' },
];

/** Required two-option control: "Who did you watch with?" */
export function CompanionPicker({ value, onChange, error, hint }: CompanionPickerProps) {
  const { colors } = useTheme();

  return (
    <View>
      <Text style={[styles.label, { color: colors.text }]}>
        Who did you watch with?<Text style={{ color: colors.rose }}> *</Text>
      </Text>
      <View
        style={[
          styles.track,
          {
            backgroundColor: colors.backgroundAlt,
            borderColor: error ? colors.rose : colors.borderSoft,
          },
        ]}
        accessibilityRole="radiogroup"
      >
        {OPTIONS.map((option) => {
          const active = option.value === value;
          return (
            <Pressable
              key={option.value}
              onPress={() => onChange(option.value)}
              accessibilityRole="radio"
              accessibilityState={{ selected: active, checked: active }}
              accessibilityLabel={option.label}
              style={[
                styles.item,
                active && { backgroundColor: colors.coralSoft, borderColor: colors.accent },
              ]}
            >
              <Ionicons
                name={option.icon}
                size={15}
                color={active ? colors.coralInk : colors.textMuted}
              />
              <Text
                style={[styles.itemLabel, { color: active ? colors.coralInk : colors.textMuted }]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.85}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {error ? (
        <View style={styles.messageRow} accessibilityRole="alert">
          <Ionicons name="alert-circle" size={13} color={colors.rose} />
          <Text style={[styles.message, { color: colors.rose }]}>{error}</Text>
        </View>
      ) : hint ? (
        <Text style={[styles.hint, { color: colors.textMuted }]}>{hint}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    ...TYPE.caption,
    fontWeight: '800',
    marginBottom: 6,
  },
  track: {
    flexDirection: 'row',
    padding: 3,
    gap: 3,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
  },
  item: {
    flex: 1,
    minWidth: 0,
    height: 40,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: 'transparent',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 4,
  },
  itemLabel: {
    flexShrink: 1,
    fontSize: 13,
    fontWeight: '700',
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 4,
    marginTop: 6,
  },
  message: {
    flex: 1,
    fontSize: 12.5,
    lineHeight: 16,
    fontWeight: '600',
  },
  hint: {
    ...TYPE.small,
    marginTop: 6,
  },
});
