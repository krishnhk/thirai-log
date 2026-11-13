import React, { useEffect, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { File, Paths } from 'expo-file-system';
import { router } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DATA_FILES, readJson, writeJson, type DataFile } from '../lib/storage';
import { SPACE, RADIUS, TYPE, useTheme } from '../theme';
import { ScreenHeader } from '../components/ScreenHeader';
import { Chip } from '../components/Chip';
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
          paddingBottom: insets.bottom + SPACE.xxxl,
          width: '100%',
          maxWidth: 720,
          alignSelf: 'center',
        }}
      >
        <ScreenHeader
          eyebrow="Preferences"
          title="Settings"
          subtitle="Make ThiraiLog feel like yours."
          right={<BackButton />}
        />

        <Group title="Appearance">
          <Row icon={mode === 'dark' ? 'moon-outline' : 'sunny-outline'} iconColor={colors.accent} label="Dark theme">
            <Switch
              value={mode === 'dark'}
              onValueChange={toggle}
              trackColor={{ false: colors.border, true: colors.accent }}
              thumbColor={colors.onAccent}
              accessibilityLabel="Dark theme"
            />
          </Row>
        </Group>

        <Group title="Dates and time" footnote="Saved with your backup. Display formatting is not applied yet.">
          <Text style={[styles.subLabel, { color: colors.textMuted }]}>Date style</Text>
          <View style={styles.chips}>
            {(['short', 'medium', 'long'] as const).map((value) => (
              <Chip
                key={value}
                label={value.charAt(0).toUpperCase() + value.slice(1)}
                active={settings.dateFormat === value}
                onPress={() => persist({ ...settings, dateFormat: value })}
              />
            ))}
          </View>
          <Text style={[styles.subLabel, { color: colors.textMuted }]}>Clock</Text>
          <View style={styles.chips}>
            {(['12h', '24h'] as const).map((value) => (
              <Chip
                key={value}
                label={value === '12h' ? '12-hour' : '24-hour'}
                active={settings.timeFormat === value}
                onPress={() => persist({ ...settings, timeFormat: value })}
              />
            ))}
          </View>
        </Group>

        <Group title="Your library">
          <Pressable onPress={() => router.push('/films')} accessibilityRole="button">
            <Row icon="film-outline" iconColor={colors.accent} label="Film database">
              <Ionicons name="chevron-forward" size={18} color={colors.textDim} />
            </Row>
          </Pressable>
          <Row icon="albums-outline" iconColor={colors.teal} label="Viewing records">
            <Text style={[styles.value, { color: colors.text }]}>{library.entries.length}</Text>
          </Row>
          <Row icon="bookmark-outline" iconColor={colors.gold} label="Watchlist films">
            <Text style={[styles.value, { color: colors.text }]}>
              {library.annual.reduce((sum, list) => sum + list.movies.length, 0)}
            </Text>
          </Row>
        </Group>

        <Group title="Backup" footnote="Your diary lives only on this device. Export a JSON backup any time and save it to Files, Drive or anywhere else.">
          <ActionButton
            label="Export backup"
            icon="share-outline"
            variant="outline"
            onPress={exportData}
            fullWidth
          />
        </Group>

        <View style={[styles.privacy, { borderColor: colors.borderSoft }]}>
          <Ionicons name="lock-closed-outline" size={16} color={colors.textDim} />
          <Text style={[styles.privacyText, { color: colors.textDim }]}>
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
      style={[styles.back, { backgroundColor: colors.surfaceAlt, borderColor: colors.borderSoft }]}
    >
      <Ionicons name="chevron-back" size={20} color={colors.text} />
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
      <Text style={[styles.groupTitle, { color: colors.textDim }]}>{title}</Text>
      <Card style={styles.groupBody} padded>
        {children}
      </Card>
      {footnote ? <Text style={[styles.footnote, { color: colors.textDim }]}>{footnote}</Text> : null}
    </View>
  );
}

function Row({
  icon,
  iconColor,
  label,
  children,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  iconColor: string;
  label: string;
  children: React.ReactNode;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.row}>
      <View style={styles.rowLeft}>
        <Ionicons name={icon} size={19} color={iconColor} />
        <Text style={[styles.rowLabel, { color: colors.text }]}>{label}</Text>
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  back: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  group: {
    paddingHorizontal: SPACE.xl,
    marginBottom: SPACE.xl,
  },
  groupTitle: {
    ...TYPE.eyebrow,
    fontSize: 10.5,
    marginBottom: SPACE.sm,
  },
  groupBody: {
    gap: SPACE.md,
  },
  footnote: {
    ...TYPE.caption,
    lineHeight: 17,
    marginTop: SPACE.sm,
    paddingHorizontal: SPACE.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACE.md,
    minHeight: 44,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.md,
    flexShrink: 1,
  },
  rowLabel: {
    ...TYPE.body,
    fontWeight: '600',
  },
  value: {
    ...TYPE.body,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  subLabel: {
    ...TYPE.caption,
    fontWeight: '700',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACE.sm,
  },
  privacy: {
    flexDirection: 'row',
    gap: SPACE.sm,
    marginHorizontal: SPACE.xl,
    paddingTop: SPACE.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  privacyText: {
    ...TYPE.caption,
    flex: 1,
    lineHeight: 17,
  },
});
