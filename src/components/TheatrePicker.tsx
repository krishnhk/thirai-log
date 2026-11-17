import React, { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { INPUT_RESET, RADIUS, TYPE, useTheme } from '../theme';
import { THEATRE_NAME_MAX, searchTheatres, type Theatre } from '../lib/theatres';

const MAX_SUGGESTIONS = 6;
/** Suggestions (and the "not in your list" hint) start once this many characters are typed. */
const MIN_CHARS = 3;

export interface TheatreChoice {
  /** Theatre name shown in the field and saved with the viewing. */
  theatre: string;
  /** Set only when a theatre from the saved list was picked. */
  theatreId?: string;
}

interface TheatrePickerProps {
  value: string;
  theatreId?: string;
  theatres: Theatre[];
  onChange: (next: TheatreChoice) => void;
  /** Called when the suggestion list opens, so the screen can scroll it into view. */
  onOpen?: () => void;
  placeholder?: string;
}

/** Theatre field that searches the saved Theatres list. Works offline, no network calls. */
export function TheatrePicker({
  value,
  theatreId,
  theatres,
  onChange,
  onOpen,
  placeholder = 'Search your theatres',
}: TheatrePickerProps) {
  const { colors } = useTheme();
  const inputRef = useRef<React.ComponentRef<typeof TextInput>>(null);
  const [focused, setFocused] = useState(false);

  const typed = value.trim();
  const picked = theatreId ? theatres.find((item) => item.id === theatreId) : undefined;
  const suggestions = searchTheatres(theatres, typed, MAX_SUGGESTIONS);
  const showPanel = focused && !picked && typed.length >= MIN_CHARS;

  const requestVisible = () => {
    if (onOpen) setTimeout(onOpen, 60);
  };

  const choose = (theatre: Theatre) => {
    onChange({ theatre: theatre.name, theatreId: theatre.id });
    setFocused(false);
    inputRef.current?.blur();
  };

  return (
    <View>
      <View
        style={[
          styles.inputRow,
          {
            backgroundColor: colors.background,
            borderColor: focused ? colors.accent : colors.border,
          },
        ]}
      >
        <Ionicons
          name={picked ? 'location' : 'location-outline'}
          size={17}
          color={picked ? colors.coralInk : colors.textMuted}
        />
        <TextInput
          ref={inputRef}
          value={value}
          onChangeText={(text) => {
            onChange({ theatre: text, theatreId: undefined });
            requestVisible();
          }}
          onFocus={() => {
            setFocused(true);
            requestVisible();
          }}
          // Short delay so a tap on a suggestion is handled before the list closes.
          onBlur={() => setTimeout(() => setFocused(false), 180)}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          maxLength={THEATRE_NAME_MAX}
          accessibilityLabel="Theatre"
          style={[styles.input, INPUT_RESET, { color: colors.text }]}
        />
        {value.length > 0 ? (
          <Pressable
            onPress={() => {
              onChange({ theatre: '', theatreId: undefined });
              inputRef.current?.focus();
            }}
            accessibilityRole="button"
            accessibilityLabel="Clear theatre"
            hitSlop={8}
          >
            <Ionicons name="close-circle" size={18} color={colors.textMuted} />
          </Pressable>
        ) : null}
      </View>

      {picked ? (
        <Text style={[styles.pickedNote, { color: colors.textMuted }]}>
          Saved theatre · {picked.district}
        </Text>
      ) : null}

      {showPanel && suggestions.length > 0 ? (
        <View style={[styles.list, { backgroundColor: colors.surface, borderColor: colors.borderSoft }]}>
          {suggestions.map((theatre, index) => (
            <Pressable
              key={theatre.id}
              onPress={() => choose(theatre)}
              accessibilityRole="button"
              accessibilityLabel={`${theatre.name}, ${theatre.district}`}
              style={({ pressed }) => [
                styles.row,
                index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.borderSoft },
                pressed && { backgroundColor: colors.accentSoft },
              ]}
            >
              <Ionicons name="location-outline" size={16} color={colors.coralInk} />
              <View style={styles.rowText}>
                <Text style={[styles.rowTitle, { color: colors.text }]}>{theatre.name}</Text>
                <Text style={[styles.rowMeta, { color: colors.textMuted }]}>{theatre.district}</Text>
              </View>
            </Pressable>
          ))}
        </View>
      ) : null}

      {/* Plain hint, not a button: nothing in the list matches what was typed. */}
      {showPanel && suggestions.length === 0 ? (
        <View style={styles.hintRow} accessibilityRole="text">
          <Ionicons name="information-circle-outline" size={16} color={colors.textMuted} />
          <Text style={[styles.hint, { color: colors.textMuted }]}>
            No theatre like “{typed}” in your list. Add it in Library → Theatres.
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    height: 46,
    borderRadius: RADIUS.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  input: {
    ...TYPE.body,
    flex: 1,
    padding: 0,
  },
  pickedNote: {
    ...TYPE.caption,
    marginTop: 6,
    marginLeft: 4,
  },
  list: {
    marginTop: 6,
    borderRadius: RADIUS.lg,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 48,
  },
  rowText: {
    flex: 1,
    minWidth: 0,
  },
  rowTitle: {
    fontSize: 14.5,
    lineHeight: 19,
    fontWeight: '700',
  },
  rowMeta: {
    fontSize: 12.5,
    lineHeight: 16,
    fontWeight: '500',
    marginTop: 1,
  },
  hintRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: 8,
    paddingHorizontal: 4,
  },
  hint: {
    ...TYPE.small,
    flex: 1,
  },
});
