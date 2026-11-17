import React, { useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RADIUS, useTheme } from '../theme';

export interface YearOption {
  value: string;
  label: string;
}

interface YearSelectProps {
  /** Newest first. The arrows step through this order; the dropdown lists it as given. */
  options: YearOption[];
  value: string;
  onChange: (value: string) => void;
  /** Accessibility name, for example "Show entries from". */
  title: string;
  /** Show the previous / next arrows around the year. Turn off for a plain dropdown. */
  arrows?: boolean;
}

interface Anchor {
  x: number;
  y: number;
  width: number;
  height: number;
}

// The list is narrower than the control and centred under the year.
const MENU_WIDTH = 140;
const MENU_MAX_HEIGHT = 300;
const EDGE = 12;

/**
 * Year control: a capsule with arrows to step to the previous or next year, and the current
 * year in the middle, which opens a dropdown with every year. Fills the width it is given.
 */
export function YearSelect({ options, value, onChange, title, arrows = true }: YearSelectProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const window = useWindowDimensions();
  const centerRef = useRef<React.ComponentRef<typeof Pressable>>(null);
  const [anchor, setAnchor] = useState<Anchor | null>(null);

  const index = Math.max(0, options.findIndex((option) => option.value === value));
  const current = options[index];
  const open = anchor !== null;

  // The list runs newest first, so "previous" (left arrow) goes to the next entry down.
  const older = options[index + 1];
  const newer = options[index - 1];

  const openMenu = () => {
    centerRef.current?.measureInWindow((x, y, width, height) => {
      setAnchor({ x, y, width, height });
    });
  };
  const close = () => setAnchor(null);

  const menuWidth = Math.min(anchor?.width ?? MENU_WIDTH, MENU_WIDTH);
  const left = anchor
    ? Math.min(Math.max(anchor.x + anchor.width / 2 - menuWidth / 2, EDGE), window.width - menuWidth - EDGE)
    : 0;
  const top = anchor ? anchor.y + anchor.height + 6 : 0;
  const maxHeight = Math.max(120, Math.min(MENU_MAX_HEIGHT, window.height - top - insets.bottom - EDGE));

  return (
    <>
      <View
        style={[
          styles.bar,
          { backgroundColor: colors.surface, borderColor: open ? colors.accent : colors.borderSoft },
        ]}
      >
        {arrows ? (
          <StepButton
            icon="chevron-back"
            label={older ? `Previous: ${older.label}` : 'Previous'}
            disabled={!older}
            onPress={() => older && onChange(older.value)}
          />
        ) : null}

        <Pressable
          ref={centerRef}
          onPress={openMenu}
          accessibilityRole="button"
          accessibilityLabel={`${title}: ${current?.label ?? ''}. Open list`}
          accessibilityState={{ expanded: open }}
          style={({ pressed }) => [
            styles.center,
            pressed && { opacity: 0.7 },
          ]}
        >
          <Text style={[styles.centerText, { color: colors.text }]} numberOfLines={1}>
            {current?.label}
          </Text>
          <Ionicons
            name={open ? 'chevron-up' : 'chevron-down'}
            size={15}
            color={colors.coralInk}
            style={!arrows && styles.chevronAtEnd}
          />
        </Pressable>

        {arrows ? (
          <StepButton
            icon="chevron-forward"
            label={newer ? `Next: ${newer.label}` : 'Next'}
            disabled={!newer}
            onPress={() => newer && onChange(newer.value)}
          />
        ) : null}
      </View>

      <Modal visible={open} transparent animationType="fade" statusBarTranslucent onRequestClose={close}>
        <Pressable style={StyleSheet.absoluteFill} onPress={close} accessibilityLabel="Close year list" />
        {anchor ? (
          <View
            style={[
              styles.menu,
              {
                left,
                top,
                width: menuWidth,
                maxHeight,
                backgroundColor: colors.surface,
                borderColor: colors.borderSoft,
              },
            ]}
          >
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {options.map((option, rowIndex) => {
                const active = option.value === value;
                return (
                  <Pressable
                    key={option.value}
                    onPress={() => {
                      onChange(option.value);
                      close();
                    }}
                    accessibilityRole="menuitem"
                    accessibilityState={{ selected: active }}
                    style={({ pressed }) => [
                      styles.row,
                      rowIndex > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.borderSoft },
                      active && { backgroundColor: colors.coralSoft },
                      pressed && { opacity: 0.8 },
                    ]}
                  >
                    <Text
                      style={[
                        styles.rowText,
                        { color: active ? colors.coralInk : colors.text, fontWeight: active ? '800' : '600' },
                      ]}
                    >
                      {option.label}
                    </Text>
                    {active ? (
                      <Ionicons name="checkmark" size={18} color={colors.primary} style={styles.tick} />
                    ) : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        ) : null}
      </Modal>
    </>
  );
}

function StepButton({
  icon,
  label,
  disabled,
  onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  disabled: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      hitSlop={4}
      style={({ pressed }) => [styles.step, disabled && { opacity: 0.3 }, pressed && { opacity: 0.6 }]}
    >
      <Ionicons name={icon} size={20} color={colors.coralInk} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 42,
    borderRadius: RADIUS.pill,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  step: {
    width: 44,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    flex: 1,
    height: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  // Dropdown alone: the year stays exactly in the middle and the chevron sits at the right edge.
  chevronAtEnd: {
    position: 'absolute',
    right: 16,
  },
  centerText: {
    fontSize: 15.5,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  menu: {
    position: 'absolute',
    borderRadius: RADIUS.lg,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    shadowColor: '#142A45',
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    // Years sit in the middle of each row; the tick stays at the right edge.
    justifyContent: 'center',
    minHeight: 42,
    paddingHorizontal: 14,
  },
  tick: {
    position: 'absolute',
    right: 12,
  },
  rowText: {
    fontSize: 15.5,
    fontVariant: ['tabular-nums'],
  },
});
