import React from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RADIUS, TYPE, useTheme } from '../theme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

export interface RowItem {
  /** Shown in the danger colour (for actions that delete data). */
  danger?: boolean;
  /** The round icon badge in the accent colour instead of the quiet default. */
  accent?: boolean;
  icon: IconName;
  label: string;
  hint: string;
  onPress: () => void;
}

/** A titled, rounded group. Pass `rows` for a list of tappable rows, or `children` for custom content. */
export function ListGroup({
  title,
  rows,
  children,
  boxStyle,
}: {
  /** Small capital heading above the group. Leave it out for a group with no heading. */
  title?: string;
  rows?: RowItem[];
  children?: React.ReactNode;
  boxStyle?: StyleProp<ViewStyle>;
}) {
  const { colors } = useTheme();
  return (
    <View>
      {title ? <Text style={[styles.groupTitle, { color: colors.textMuted }]}>{title}</Text> : <View style={styles.noTitle} />}
      <View style={[styles.group, { backgroundColor: colors.surface, borderColor: colors.borderSoft }, boxStyle]}>
        {rows?.map((row, index) => (
          <ListRow key={row.label} row={row} divider={index > 0} />
        ))}
        {children}
      </View>
    </View>
  );
}

export function ListRow({ row, divider }: { row: RowItem; divider: boolean }) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={row.onPress}
      accessibilityRole="button"
      accessibilityLabel={`${row.label}. ${row.hint}`}
      style={({ pressed }) => [
        styles.row,
        divider && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
        pressed && { backgroundColor: colors.accentSoft },
      ]}
    >
      <View
        style={[
          styles.badge,
          { backgroundColor: row.danger ? `${colors.rose}1F` : row.accent ? colors.accentSoft : colors.coralSoft },
        ]}
      >
        <Ionicons
          name={row.icon}
          size={18}
          color={row.danger ? colors.rose : row.accent ? colors.accent : colors.coralInk}
        />
      </View>
      <View style={styles.rowText}>
        <Text style={[styles.label, { color: row.danger ? colors.rose : colors.text }]}>{row.label}</Text>
        <Text style={[styles.hint, { color: colors.textMuted }]} numberOfLines={1}>
          {row.hint}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textDim} />
    </Pressable>
  );
}

/** Shared page layout styles for screens made of grouped lists. */
export const listPageStyles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 12,
    paddingTop: 4,
    paddingBottom: 36,
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
  },
});

const styles = StyleSheet.create({
  groupTitle: {
    ...TYPE.eyebrow,
    fontSize: 10,
    letterSpacing: 1.4,
    marginTop: 18,
    marginBottom: 6,
    paddingHorizontal: 6,
  },
  noTitle: {
    height: 12,
  },
  group: {
    borderRadius: RADIUS.xl,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    shadowColor: '#1A2A42',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  badge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: {
    flex: 1,
    minWidth: 0,
  },
  label: {
    fontSize: 15,
    lineHeight: 19,
    fontWeight: '800',
  },
  hint: {
    fontSize: 12.5,
    lineHeight: 16,
    fontWeight: '600',
    marginTop: 1,
  },
});
