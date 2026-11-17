import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RADIUS, SERIF, SPACE, TYPE, useTheme } from '../theme';
import { MONTH_NAMES, monthShort, todayInputValue } from '../lib/format';

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MIN_YEAR = 1900;

interface DatePickerSheetProps {
  visible: boolean;
  /** Selected date as `YYYY-MM-DD`. */
  value: string;
  /** Called with a `YYYY-MM-DD` date; the sheet closes itself afterwards. */
  onSelect: (value: string) => void;
  onClose: () => void;
}

interface Ymd {
  y: number;
  m: number; // 0-based
  d: number;
}

function parse(value: string): Ymd | null {
  const match = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(value.trim());
  if (!match) return null;
  return { y: Number(match[1]), m: Number(match[2]) - 1, d: Number(match[3]) };
}

function toValue({ y, m, d }: Ymd): string {
  return `${y}-${`${m + 1}`.padStart(2, '0')}-${`${d}`.padStart(2, '0')}`;
}

/** Sortable number for comparing dates without time zones. */
const rank = ({ y, m, d }: Ymd) => y * 10000 + m * 100 + d;

/** Compact calendar bottom sheet. Future dates cannot be picked. */
export function DatePickerSheet({ visible, value, onSelect, onClose }: DatePickerSheetProps) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      {/* Mounted only while open, so the calendar always starts on the selected month. */}
      <SheetBody value={value} onSelect={onSelect} onClose={onClose} />
    </Modal>
  );
}

function SheetBody({
  value,
  onSelect,
  onClose,
}: Omit<DatePickerSheetProps, 'visible'>) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const today = parse(todayInputValue()) as Ymd;
  const selected = parse(value);
  const start = selected && rank(selected) <= rank(today) ? selected : today;

  const [viewYear, setViewYear] = useState(start.y);
  const [viewMonth, setViewMonth] = useState(start.m);
  const [pickingMonth, setPickingMonth] = useState(false);

  const monthIndex = viewYear * 12 + viewMonth;
  const maxIndex = today.y * 12 + today.m;
  const canGoNext = monthIndex < maxIndex;
  const canGoPrev = viewYear > MIN_YEAR || viewMonth > 0;

  const shiftMonth = (delta: number) => {
    const next = monthIndex + delta;
    setViewYear(Math.floor(next / 12));
    setViewMonth(next % 12);
  };

  const choose = (date: Ymd) => {
    if (rank(date) > rank(today)) return;
    onSelect(toValue(date));
    onClose();
  };

  // Day grid: leading blanks, then each day of the month.
  const firstWeekday = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);
  const rows = Array.from({ length: cells.length / 7 }, (_, r) => cells.slice(r * 7, r * 7 + 7));

  return (
    <View style={[styles.overlay, { backgroundColor: colors.overlay }]}>
      <Pressable style={styles.flex} onPress={onClose} accessibilityLabel="Close calendar" />
      <View
        style={[
          styles.sheet,
          {
            backgroundColor: colors.background,
            borderColor: colors.borderSoft,
            paddingBottom: insets.bottom + 14,
          },
        ]}
      >
        <View style={[styles.handle, { backgroundColor: colors.border }]} />

        {pickingMonth ? (
          <>
            <View style={styles.header}>
              <NavButton
                icon="chevron-back"
                label="Previous year"
                disabled={viewYear <= MIN_YEAR}
                onPress={() => setViewYear((year) => year - 1)}
              />
              <Text style={[styles.heading, { color: colors.text }]}>{viewYear}</Text>
              <NavButton
                icon="chevron-forward"
                label="Next year"
                disabled={viewYear >= today.y}
                onPress={() => setViewYear((year) => year + 1)}
              />
            </View>
            <View style={styles.monthGrid}>
              {MONTH_NAMES.map((_, index) => {
                const disabled = viewYear * 12 + index > maxIndex;
                const active = index === viewMonth;
                return (
                  <Pressable
                    key={index}
                    disabled={disabled}
                    onPress={() => {
                      setViewMonth(index);
                      setPickingMonth(false);
                    }}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active, disabled }}
                    style={[
                      styles.monthCell,
                      {
                        backgroundColor: active ? colors.primary : colors.surface,
                        borderColor: active ? colors.primary : colors.borderSoft,
                        opacity: disabled ? 0.35 : 1,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.monthLabel,
                        { color: active ? colors.primaryText : colors.text },
                      ]}
                    >
                      {monthShort(index)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </>
        ) : (
          <>
            <View style={styles.header}>
              <NavButton
                icon="chevron-back"
                label="Previous month"
                disabled={!canGoPrev}
                onPress={() => shiftMonth(-1)}
              />
              <Pressable
                onPress={() => setPickingMonth(true)}
                accessibilityRole="button"
                accessibilityLabel={`${MONTH_NAMES[viewMonth]} ${viewYear}, choose month and year`}
                style={styles.headingButton}
                hitSlop={6}
              >
                <Text style={[styles.heading, { color: colors.text }]}>
                  {MONTH_NAMES[viewMonth]} {viewYear}
                </Text>
                <Ionicons name="chevron-down" size={15} color={colors.coralInk} />
              </Pressable>
              <NavButton
                icon="chevron-forward"
                label="Next month"
                disabled={!canGoNext}
                onPress={() => shiftMonth(1)}
              />
            </View>

            <View style={styles.weekRow}>
              {WEEKDAYS.map((day, index) => (
                <Text key={index} style={[styles.weekday, { color: colors.textMuted }]}>
                  {day}
                </Text>
              ))}
            </View>

            {rows.map((row, rowIndex) => (
              <View key={rowIndex} style={styles.weekRow}>
                {row.map((day, colIndex) => {
                  if (day === null) return <View key={colIndex} style={styles.dayCell} />;
                  const date: Ymd = { y: viewYear, m: viewMonth, d: day };
                  const future = rank(date) > rank(today);
                  const isSelected = selected !== null && rank(date) === rank(selected);
                  const isToday = rank(date) === rank(today);
                  return (
                    <Pressable
                      key={colIndex}
                      disabled={future}
                      onPress={() => choose(date)}
                      accessibilityRole="button"
                      accessibilityLabel={`${day} ${MONTH_NAMES[viewMonth]} ${viewYear}`}
                      accessibilityState={{ selected: isSelected, disabled: future }}
                      style={styles.dayCell}
                    >
                      <View
                        style={[
                          styles.dayInner,
                          isSelected && { backgroundColor: colors.primary },
                          !isSelected && isToday && { borderColor: colors.accent, borderWidth: 1.5 },
                        ]}
                      >
                        <Text
                          style={[
                            styles.dayText,
                            {
                              color: isSelected ? colors.primaryText : colors.text,
                              opacity: future ? 0.3 : 1,
                              fontWeight: isSelected || isToday ? '800' : '600',
                            },
                          ]}
                        >
                          {day}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            ))}
          </>
        )}

        <View style={styles.footer}>
          <Pressable
            onPress={() => choose(today)}
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.footerButton,
              { borderColor: `${colors.accent}66`, backgroundColor: colors.accentSoft },
              pressed && { opacity: 0.7 },
            ]}
          >
            <Ionicons name="today-outline" size={16} color={colors.coralInk} />
            <Text style={[styles.footerText, { color: colors.coralInk }]}>Today</Text>
          </Pressable>
          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            style={({ pressed }) => [styles.footerButton, styles.cancel, pressed && { opacity: 0.7 }]}
          >
            <Text style={[styles.footerText, { color: colors.textMuted }]}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function NavButton({
  icon,
  label,
  disabled,
  onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  disabled?: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: Boolean(disabled) }}
      hitSlop={6}
      style={({ pressed }) => [
        styles.nav,
        { backgroundColor: colors.surface, borderColor: colors.borderSoft },
        disabled && { opacity: 0.35 },
        pressed && { opacity: 0.7 },
      ]}
    >
      <Ionicons name={icon} size={18} color={colors.coralInk} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingTop: SPACE.sm,
  },
  handle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    marginBottom: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  headingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  heading: {
    fontFamily: SERIF,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  nav: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekRow: {
    flexDirection: 'row',
  },
  weekday: {
    ...TYPE.caption,
    flex: 1,
    textAlign: 'center',
    fontWeight: '800',
    paddingVertical: 6,
  },
  dayCell: {
    flex: 1,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayInner: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0,
  },
  dayText: {
    fontSize: 15,
    fontVariant: ['tabular-nums'],
  },
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingVertical: 6,
  },
  monthCell: {
    width: '31.5%',
    height: 46,
    borderRadius: RADIUS.lg,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthLabel: {
    fontSize: 15,
    fontWeight: '700',
  },
  footer: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  footerButton: {
    flex: 1,
    height: 42,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancel: {
    borderColor: 'transparent',
  },
  footerText: {
    fontSize: 14,
    fontWeight: '800',
  },
});
