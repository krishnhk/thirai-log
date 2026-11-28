import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RADIUS, THEMES, TYPE, useTheme } from '../theme';
import { useLibrary } from '../hooks/useLibrary';
import { eraseAllData, exportBackup, importBackup } from '../lib/backup';
import { AppHeader } from '../components/AppHeader';
import { listPageStyles as page } from '../components/ListGroup';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

/**
 * Settings: Appearance (one tap switches between dark and light), Data (export and import) and, in its own
 * red-edged card, Erase all data.
 */
export default function SettingsScreen() {
  const { colors, name, setTheme } = useTheme();
  const { refresh } = useLibrary();
  const isDark = name === 'desk-dark';

  return (
    <View style={[page.root, { backgroundColor: colors.background }]}>
      <AppHeader title="Settings" subtitle="Appearance, backup and your data." />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={page.content}>
        <Text style={[styles.eyebrow, styles.eyebrowFirst, { color: colors.textMuted }]}>LOOK</Text>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.borderSoft }]}>
          {/* One tap switches the theme; the row shows the one in use, with a sun or moon to match. */}
          <SettingsRow
            icon={isDark ? 'moon' : 'sunny'}
            label="Appearance"
            value={THEMES[name].label}
            trailing={isDark ? 'sunny-outline' : 'moon-outline'}
            hint={`Switch to ${THEMES[isDark ? 'desk-light' : 'desk-dark'].label.toLowerCase()} mode`}
            onPress={() => setTheme(isDark ? 'desk-light' : 'desk-dark')}
          />
        </View>

        <Text style={[styles.eyebrow, { color: colors.textMuted }]}>DATA</Text>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.borderSoft }]}>
          <SettingsRow icon="cloud-upload-outline" label="Export backup" onPress={() => exportBackup()} />
          <SettingsRow
            icon="cloud-download-outline"
            label="Import backup"
            onPress={() => importBackup(refresh)}
            divider
          />
        </View>

        <View
          style={[
            styles.card,
            styles.dangerCard,
            { backgroundColor: `${colors.rose}0F`, borderColor: `${colors.rose}66` },
          ]}
        >
          <SettingsRow danger icon="trash-outline" label="Erase all data" onPress={() => eraseAllData(refresh)} />
        </View>
      </ScrollView>
    </View>
  );
}

/**
 * One settings row: a round icon, the label, an optional current value, and a chevron (or a custom icon on
 * the right when `trailing` is given).
 */
function SettingsRow({
  icon,
  label,
  value,
  trailing,
  hint,
  danger,
  divider,
  onPress,
}: {
  icon: IconName;
  label: string;
  value?: string;
  /** An icon shown at the right end instead of the chevron. */
  trailing?: IconName;
  /** Spoken to screen readers after the label. */
  hint?: string;
  danger?: boolean;
  divider?: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={value ? `${label}, ${value}` : label}
      accessibilityHint={hint}
      style={({ pressed }) => [
        styles.row,
        divider && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
        pressed && { backgroundColor: colors.accentSoft },
      ]}
    >
      <View style={[styles.badge, { backgroundColor: danger ? `${colors.rose}26` : colors.coralSoft }]}>
        <Ionicons name={icon} size={18} color={danger ? colors.rose : colors.coralInk} />
      </View>
      <Text style={[styles.label, { color: danger ? colors.rose : colors.text }]} numberOfLines={1}>
        {label}
      </Text>
      {value ? (
        <Text style={[styles.value, { color: colors.textMuted }]} numberOfLines={1}>
          {value}
        </Text>
      ) : null}
      {trailing ? <Ionicons name={trailing} size={20} color={colors.textDim} /> : null}
      {danger || trailing ? null : <Ionicons name="chevron-forward" size={18} color={colors.textDim} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  eyebrow: {
    ...TYPE.eyebrow,
    fontSize: 10,
    letterSpacing: 1.4,
    marginTop: 20,
    marginBottom: 8,
    paddingHorizontal: 6,
  },
  eyebrowFirst: {
    marginTop: 8,
  },
  card: {
    borderRadius: RADIUS.xl,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  dangerCard: {
    marginTop: 20,
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
  label: {
    flex: 1,
    fontSize: 15,
    lineHeight: 19,
    fontWeight: '800',
  },
  value: {
    fontSize: 12.5,
    fontWeight: '600',
    maxWidth: '50%',
  },
});
