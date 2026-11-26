import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, type Href } from 'expo-router';
import { RADIUS, TYPE, useTheme } from '../theme';
import { useLibrary } from '../hooks/useLibrary';
import { searchableFilms } from '../lib/library';
import { eraseAllData, exportBackup, importBackup } from '../lib/backup';
import { AppHeader } from '../components/AppHeader';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

interface RowItem {
  /** Shown in the danger colour (for actions that delete data). */
  danger?: boolean;
  icon: IconName;
  label: string;
  hint: string;
  onPress: () => void;
}

/** A calm, grouped list: Collections, Insights and Backup. */
export default function LibraryScreen() {
  const { colors } = useTheme();
  const { library, refresh } = useLibrary();
  const films = searchableFilms(library).length;
  const theatres = library.theatres.length;

  const groups: { title: string; rows: RowItem[] }[] = [
    {
      title: 'COLLECTIONS',
      rows: [
        {
          icon: 'location',
          label: 'Theatres',
          hint: `${theatres} ${theatres === 1 ? 'theatre' : 'theatres'}`,
          onPress: () => router.push('/theatres' as Href),
        },
        {
          icon: 'film',
          label: 'Film database',
          hint: `${films} ${films === 1 ? 'film' : 'films'}`,
          onPress: () => router.push('/films' as Href),
        },
      ],
    },
    {
      title: 'INSIGHTS',
      rows: [
        {
          icon: 'stats-chart',
          label: 'Statistics',
          hint: 'Your year in numbers',
          onPress: () => router.push('/statistics' as Href),
        },
      ],
    },
    {
      title: 'BACKUP',
      rows: [
        {
          icon: 'cloud-upload-outline',
          label: 'Export',
          hint: 'Save everything to a file',
          onPress: () => exportBackup(),
        },
        {
          icon: 'cloud-download-outline',
          label: 'Import',
          hint: 'Add data from a backup file',
          onPress: () => importBackup(refresh),
        },
      ],
    },
    {
      title: 'DANGER ZONE',
      rows: [
        {
          danger: true,
          icon: 'trash-outline',
          label: 'Erase all data',
          hint: 'Delete everything and start empty',
          onPress: () => eraseAllData(refresh),
        },
      ],
    },
  ];

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <AppHeader title="Library" subtitle="Your theatres, films, numbers and backup." />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {groups.map((group) => (
          <View key={group.title}>
            <Text style={[styles.groupTitle, { color: colors.textMuted }]}>{group.title}</Text>
            <View style={[styles.group, { backgroundColor: colors.surface, borderColor: colors.borderSoft }]}>
              {group.rows.map((row, index) => (
                <ListRow key={row.label} row={row} divider={index > 0} />
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

function ListRow({ row, divider }: { row: RowItem; divider: boolean }) {
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
      <View style={[styles.badge, { backgroundColor: row.danger ? `${colors.rose}1F` : colors.coralSoft }]}>
        <Ionicons name={row.icon} size={18} color={row.danger ? colors.rose : colors.coralInk} />
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

const styles = StyleSheet.create({
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
  groupTitle: {
    ...TYPE.eyebrow,
    fontSize: 10,
    letterSpacing: 1.4,
    marginTop: 18,
    marginBottom: 6,
    paddingHorizontal: 6,
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
