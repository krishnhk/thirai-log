import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RADIUS, SERIF, SPACE, TYPE, useTheme } from '../theme';
import { MONTH_NAMES, monthShort, todayInputValue } from '../lib/format';

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MIN_YEAR = 1900;
/** Years shown on one page of the year picker (3 columns by 4 rows). */
const YEARS_PER_PAGE = 12;

type Mode = 'days' | 'months' | 'years';

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

/**
 * Compact calendar bottom sheet. Future dates cannot be picked. Tapping a day highlights it, and
 * "Confirm date" applies it. Tapping outside the sheet closes it without changing the date.
 */
export function DatePickerSheet({ visible, value, onSelect, onClose }: DatePickerSheetProps) {
  return (
    <Modal visible={visible} animationType="none" transparent onRequestClose={onClose}>
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
  // Year picker, then month picker, then the days: each step opens the next.
  const [mode, setMode] = useState<Mode>('days');
  // First year on the page of years being shown. The newest page ends with the current year.
  const pageStartFor = (year: number) => today.y - (YEARS_PER_PAGE - 1) - YEARS_PER_PAGE * Math.floor((today.y - year) / YEARS_PER_PAGE);
  const [yearPageStart, setYearPageStart] = useState(() => pageStartFor(start.y));
  // The highlighted day; only applied when "Confirm date" is tapped.
  const [pending, setPending] = useState<Ymd>(start);

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
    setPending(date);
  };

  // 0 = closed, 1 = open. The dark backdrop fades while only the sheet slides, so the backdrop never moves.
  const [progress] = useState(() => new Animated.Value(0));
  const closing = useRef(false);

  useEffect(() => {
    Animated.timing(progress, {
      toValue: 1,
      duration: 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [progress]);

  const close = (after?: () => void) => {
    if (closing.current) return;
    closing.current = true;
    Animated.timing(progress, {
      toValue: 0,
      duration: 200,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      after?.();
      onClose();
    });
  };

  const confirm = () => close(() => onSelect(toValue(pending)));

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
    <View style={styles.overlay}>
      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { backgroundColor: colors.overlay, opacity: progress }]}
      />
      <Pressable style={styles.flex} onPress={() => close()} accessibilityLabel="Close calendar" />
      <Animated.View
        style={[
          styles.sheet,
          {
            backgroundColor: colors.background,
            borderColor: colors.borderSoft,
            paddingBottom: insets.bottom + 14,
            transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [520, 0] }) }],
          },
        ]}
      >
        <View style={[styles.handle, { backgroundColor: colors.border }]} />

        {mode === 'years' ? (
          <>
            <View style={styles.header}>
              <NavButton
                icon="chevron-back"
                label="Earlier years"
                disabled={yearPageStart <= MIN_YEAR}
                onPress={() => setYearPageStart((first) => first - YEARS_PER_PAGE)}
              />
              <Text style={[styles.heading, { color: colors.text }]}>
                {yearPageStart} – {yearPageStart + YEARS_PER_PAGE - 1}
              </Text>
              <NavButton
                icon="chevron-forward"
                label="Later years"
                disabled={yearPageStart + YEARS_PER_PAGE - 1 >= today.y}
                onPress={() => setYearPageStart((first) => first + YEARS_PER_PAGE)}
              />
            </View>
            <View style={styles.pickGrid}>
              {Array.from({ length: YEARS_PER_PAGE }, (_, index) => yearPageStart + index).map((year) => {
                const disabled = year > today.y || year < MIN_YEAR;
                const active = year === viewYear;
                return (
                  <PickCell
                    key={year}
                    label={String(year)}
                    active={active}
                    disabled={disabled}
                    onPress={() => {
                      setViewYear(year);
                      setMode('months');
                    }}
                  />
                );
              })}
            </View>
          </>
        ) : mode === 'months' ? (
          <>
            <View style={styles.header}>
              <NavButton
                icon="chevron-back"
                label="Previous year"
                disabled={viewYear <= MIN_YEAR}
                onPress={() => setViewYear((year) => year - 1)}
              />
              <Pressable
                onPress={() => {
                  setYearPageStart(pageStartFor(viewYear));
                  setMode('years');
                }}
                accessibilityRole="button"
                accessibilityLabel={`${viewYear}, choose another year`}
                style={styles.headingButton}
                hitSlop={6}
              >
                <Text style={[styles.heading, { color: colors.text }]}>{viewYear}</Text>
              </Pressable>
              <NavButton
                icon="chevron-forward"
                label="Next year"
                disabled={viewYear >= today.y}
                onPress={() => setViewYear((year) => year + 1)}
              />
            </View>
            <View style={styles.pickGrid}>
              {MONTH_NAMES.map((_, index) => {
                const disabled = viewYear * 12 + index > maxIndex;
                return (
                  <PickCell
                    key={index}
                    label={monthShort(index)}
                    active={index === viewMonth}
                    disabled={disabled}
                    onPress={() => {
                      setViewMonth(index);
                      setMode('days');
                    }}
                  />
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
                onPress={() => setMode('months')}
                accessibilityRole="button"
                accessibilityLabel={`${MONTH_NAMES[viewMonth]} ${viewYear}, choose month and year`}
                style={styles.headingButton}
                hitSlop={6}
              >
                <Text style={[styles.heading, { color: colors.text }]}>
                  {MONTH_NAMES[viewMonth]} {viewYear}
                </Text>
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
                  const isSelected = rank(date) === rank(pending);
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
                          !future && { backgroundColor: colors.backgroundAlt },
                          isSelected && { backgroundColor: colors.text },
                        ]}
                      >
                        <Text
                          style={[
                            styles.dayText,
                            {
                              color: isSelected ? colors.onAccent : colors.text,
                              opacity: future ? 0.3 : 1,
                              fontWeight: isSelected ? '800' : '700',
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

        {mode === 'days' ? (
          <Pressable
            onPress={confirm}
            accessibilityRole="button"
            accessibilityLabel="Confirm date"
            style={({ pressed }) => [
              styles.confirm,
              { backgroundColor: colors.primary },
              pressed && { opacity: 0.8 },
            ]}
          >
            <Text style={[styles.confirmText, { color: colors.primaryText }]}>Confirm date</Text>
          </Pressable>
        ) : null}
      </Animated.View>
    </View>
  );
}

/** One tile of the year or month picker: sand when free, navy when chosen, faded when not allowed. */
function PickCell({
  label,
  active,
  disabled,
  onPress,
}: {
  label: string;
  active: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active, disabled }}
      style={({ pressed }) => [
        styles.pickCell,
        { backgroundColor: disabled ? 'transparent' : active ? colors.text : colors.backgroundAlt },
        pressed && { opacity: 0.7 },
      ]}
    >
      <Text
        style={[
          styles.pickLabel,
          { color: active ? colors.onAccent : colors.text, opacity: disabled ? 0.3 : 1 },
        ]}
      >
        {label}
      </Text>
    </Pressable>
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
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayInner: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0,
  },
  dayText: {
    fontSize: 15,
    fontVariant: ['tabular-nums'],
  },
  pickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingVertical: 4,
  },
  pickCell: {
    width: '31.5%',
    height: 54,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickLabel: {
    fontSize: 16,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  confirm: {
    height: 48,
    marginTop: 14,
    borderRadius: RADIUS.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmText: {
    fontSize: 15,
    fontWeight: '800',
  },
});
