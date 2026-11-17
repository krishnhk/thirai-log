import React, { useEffect, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { File, Paths } from 'expo-file-system';
import { router } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DATA_FILES, readJson, writeJson, type DataFile } from '../lib/storage';
import { RADIUS, SPACE, TYPE, useTheme } from '../theme';
import { ActionButton } from '../components/ActionButton';
import { Card } from '../components/Card';
import { notify } from '../lib/ui';
import { useLibrary } from '../hooks/useLibrary';
import { STORAGE_KEYS } from '../lib/library';


interface SettingsState {
  dateFormat: 'short' | 'medium' | 'long';
  timeFormat: '12h' | '24h';
}

export default function SettingsScreen() {
  const { colors, mode, toggle } = useTheme();
  const insets = useSafeAreaInsets();
  const { library } = useLibrary();

  const [settings, setSettings] = useState<SettingsState>({
    dateFormat: 'short',
    timeFormat: '12h',
  });

  useEffect(() => {
    readJson<any>(DATA_FILES.settings, null)
      .then((parsed) => {
        if (!parsed) return;
        setSettings({
          dateFormat: parsed?.dateFormat ?? 'short',
          timeFormat: parsed?.timeFormat ?? '12h',
        });
      })
      .catch(() => {});
  }, []);

  const persist = async (next: SettingsState) => {
    setSettings(next);
    await writeJson(DATA_FILES.settings, { ...next, theme: mode });
  };

  const readJsonKey = (key: DataFile) => readJson<unknown>(key, []);

  const exportData = async () => {
    try {
      const data = {
        viewingEntries: await readJsonKey(STORAGE_KEYS.viewingEntries),
        watchlistMovies: await readJsonKey(STORAGE_KEYS.watchlistMovies),
        annualWatchlists: await readJsonKey(STORAGE_KEYS.annualWatchlists),
        theatres: await readJsonKey(DATA_FILES.theatres),
        settings: { ...settings, theme: mode },
        exportedAt: new Date().toISOString(),
      };
      const json = JSON.stringify(data, null, 2);

      if (Platform.OS === 'web') {
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'thirai-log-backup.json';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        notify('Backup ready', 'Your ThiraiLog data has been downloaded.');
        return;
      }

      // Mobile: write to the cache folder and hand it to the system share sheet.
      const file = new File(Paths.cache, 'thirai-log-backup.json');
      if (file.exists) file.delete();
      await file.write(json);

      if (!(await Sharing.isAvailableAsync())) {
        notify('Backup saved', `Saved to ${file.uri}`);
        return;
      }
      await Sharing.shareAsync(file.uri, {
        mimeType: 'application/json',
        dialogTitle: 'Export ThiraiLog backup',
        UTI: 'public.json',
      });
    } catch {
      notify('Export failed', 'Could not export your data.');
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: insets.bottom + SPACE.xxl,
          width: '100%',
          maxWidth: 720,
          alignSelf: 'center',
        }}
      >
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <BackButton />
          <View style={styles.headerText}>
            <Text style={[styles.title, { color: colors.text }]}>Settings</Text>
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>
              Make Thirailog feel like yours.
            </Text>
          </View>
        </View>

        <Group title="Appearance">
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <IconBadge
                icon={mode === 'dark' ? 'moon' : 'sunny'}
                color={colors.coralInk}
                bg={colors.coralSoft}
              />
              <Text style={[styles.rowLabel, { color: colors.text }]}>Dark theme</Text>
            </View>
            <Switch
              value={mode === 'dark'}
              onValueChange={toggle}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#FFFFFF"
              accessibilityLabel="Dark theme"
            />
          </View>
        </Group>

        <Group title="Dates and time" footnote="Date style is used for the date shown when logging a film. Both settings are saved with your backup.">
          <View style={styles.block}>
            <Text style={[styles.subLabel, { color: colors.text }]}>Date style</Text>
            <Segmented
              options={[
                { value: 'short', label: 'Short' },
                { value: 'medium', label: 'Medium' },
                { value: 'long', label: 'Long' },
              ]}
              value={settings.dateFormat}
              onChange={(value) => persist({ ...settings, dateFormat: value })}
            />
          </View>
          <View style={[styles.divider, { backgroundColor: colors.borderSoft }]} />
          <View style={styles.block}>
            <Text style={[styles.subLabel, { color: colors.text }]}>Clock</Text>
            <Segmented
              options={[
                { value: '12h', label: '12-hour' },
                { value: '24h', label: '24-hour' },
              ]}
              value={settings.timeFormat}
              onChange={(value) => persist({ ...settings, timeFormat: value })}
            />
          </View>
        </Group>

        <Group title="Your library">
          <Pressable
            onPress={() => router.push('/films')}
            accessibilityRole="button"
            style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}
          >
            <View style={styles.rowLeft}>
              <IconBadge icon="film" color={colors.coralInk} bg={colors.coralSoft} />
              <Text style={[styles.rowLabel, { color: colors.text }]}>Film database</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.coralInk} />
          </Pressable>
          <View style={[styles.divider, { backgroundColor: colors.borderSoft }]} />
          <Pressable
            onPress={() => router.push('/theatres')}
            accessibilityRole="button"
            style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}
          >
            <View style={styles.rowLeft}>
              <IconBadge icon="location" color={colors.coralInk} bg={colors.coralSoft} />
              <Text style={[styles.rowLabel, { color: colors.text }]}>Theatres visited</Text>
            </View>
            <View style={styles.rowRight}>
              <Text style={[styles.value, { color: colors.coralInk }]}>{library.theatres.length}</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.coralInk} />
            </View>
          </Pressable>
          <View style={[styles.divider, { backgroundColor: colors.borderSoft }]} />
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <IconBadge icon="albums" color={colors.sageInk} bg={colors.sageSoft} />
              <Text style={[styles.rowLabel, { color: colors.text }]}>Viewing records</Text>
            </View>
            <Text style={[styles.value, { color: colors.coralInk }]}>{library.entries.length}</Text>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.borderSoft }]} />
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <IconBadge icon="bookmark" color={colors.coralInk} bg={colors.goldSoft} />
              <Text style={[styles.rowLabel, { color: colors.text }]}>Watchlist films</Text>
            </View>
            <Text style={[styles.value, { color: colors.coralInk }]}>
              {library.annual.reduce((sum, list) => sum + list.movies.length, 0)}
            </Text>
          </View>
        </Group>

        <Group title="Backup">
          <Text style={[styles.backupText, { color: colors.textMuted }]}>
            Your diary lives only on this device. Export a JSON backup any time and save it to Files,
            Drive or anywhere else.
          </Text>
          <ActionButton
            label="Export backup"
            icon="share-outline"
            onPress={exportData}
            fullWidth
            compact
            style={styles.exportButton}
          />
        </Group>

        <View style={[styles.privacy, { borderColor: colors.borderSoft }]}>
          <Ionicons name="lock-closed-outline" size={16} color={colors.textMuted} />
          <Text style={[styles.privacyText, { color: colors.textMuted }]}>
            Private by design. No accounts, no social feeds, no tracking. Every memory stays with you.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

function BackButton() {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={() => router.back()}
      accessibilityRole="button"
      accessibilityLabel="Back"
      hitSlop={4}
      style={({ pressed }) => [
        styles.back,
        { backgroundColor: colors.surface, borderColor: colors.borderSoft },
        pressed && { opacity: 0.7 },
      ]}
    >
      <Ionicons name="chevron-back" size={20} color={colors.coralInk} />
    </Pressable>
  );
}

function Group({
  title,
  footnote,
  children,
}: {
  title: string;
  footnote?: string;
  children: React.ReactNode;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.group}>
      <Text style={[styles.groupTitle, { color: colors.coralInk }]}>{title}</Text>
      <Card style={styles.groupBody} padded={false}>
        {children}
      </Card>
      {footnote ? <Text style={[styles.footnote, { color: colors.textMuted }]}>{footnote}</Text> : null}
    </View>
  );
}

function IconBadge({
  icon,
  color,
  bg,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  color: string;
  bg: string;
}) {
  return (
    <View style={[styles.iconBadge, { backgroundColor: bg }]}>
      <Ionicons name={icon} size={16} color={color} />
    </View>
  );
}

function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  const { colors } = useTheme();
  return (
    <View style={[styles.segTrack, { backgroundColor: colors.backgroundAlt, borderColor: colors.borderSoft }]}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            style={[
              styles.segItem,
              active && { backgroundColor: colors.coralSoft, borderColor: colors.accent },
            ]}
          >
            <Text
              style={[
                styles.segLabel,
                { color: active ? colors.coralInk : colors.textMuted },
              ]}
              numberOfLines={1}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  headerText: {
    flex: 1,
  },
  title: {
    ...TYPE.title,
    fontSize: 24,
    lineHeight: 28,
  },
  subtitle: {
    ...TYPE.small,
    marginTop: 1,
  },
  back: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#142A45',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  group: {
    paddingHorizontal: 12,
    marginBottom: 14,
  },
  groupTitle: {
    ...TYPE.eyebrow,
    marginBottom: 6,
    marginLeft: 4,
  },
  groupBody: {
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  footnote: {
    ...TYPE.caption,
    lineHeight: 16,
    marginTop: 6,
    paddingHorizontal: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACE.md,
    minHeight: 48,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexShrink: 1,
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: {
    ...TYPE.body,
    fontWeight: '700',
  },
  value: {
    ...TYPE.body,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  divider: {
    height: StyleSheet.hairlineWidth * 2,
  },
  block: {
    paddingVertical: 10,
    gap: 8,
  },
  subLabel: {
    ...TYPE.caption,
    fontWeight: '800',
  },
  segTrack: {
    flexDirection: 'row',
    padding: 3,
    gap: 3,
    borderRadius: RADIUS.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  segItem: {
    flex: 1,
    height: 34,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  segLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  backupText: {
    ...TYPE.small,
    paddingTop: 10,
  },
  exportButton: {
    marginTop: 10,
    marginBottom: 10,
    minHeight: 44,
  },
  privacy: {
    flexDirection: 'row',
    gap: SPACE.sm,
    marginHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  privacyText: {
    ...TYPE.caption,
    flex: 1,
    lineHeight: 17,
  },
});
