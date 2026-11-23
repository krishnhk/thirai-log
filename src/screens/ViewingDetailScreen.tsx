import React, { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RADIUS, TYPE, useTheme } from '../theme';
import { useLibrary } from '../hooks/useLibrary';
import { deleteViewingEntry, resolvePoster } from '../lib/library';
import { confirmAction, holdSaving, notify } from '../lib/ui';
import { theatreDisplay } from '../lib/theatres';
import { COMPANION_LABELS } from '../lib/stats';
import { MONTH_NAMES, toDate } from '../lib/format';
import { Poster } from '../components/Poster';
import { EditIcon } from '../components/EditIcon';
import { SavingOverlay } from '../components/SavingOverlay';
import { ActionButton } from '../components/ActionButton';

interface ViewingDetailScreenProps {
  /** Id of the saved diary entry to show. */
  entryId: string;
  /** True right after logging a film: shows a Done button that returns to the Diary. */
  showDone?: boolean;
}

/** Long date such as "23 July 2026". */
function longDate(value: string): string {
  const date = toDate(value);
  return `${date.getDate()} ${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`;
}

/**
 * Shows one saved viewing: poster, film name, the date it was watched and the theatre.
 * Used after logging a film and when a Diary entry is opened.
 */
export default function ViewingDetailScreen({ entryId, showDone }: ViewingDetailScreenProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const { library, loading, refresh } = useLibrary();
  const [deleting, setDeleting] = useState(false);

  const entry = library.entries.find((item) => item.id === entryId);
  const place = entry ? theatreDisplay(entry, library.theatres) : null;

  const handleDelete = () => {
    if (!entry || deleting) return;
    const id = entry.id;
    confirmAction('Delete entry', 'Are you sure you want to delete this diary entry?', async () => {
      setDeleting(true);
      const startedAt = Date.now();
      try {
        await deleteViewingEntry(id);
        await refresh();
        await holdSaving(startedAt);
        router.navigate('/diary');
      } catch {
        notify('Could not delete', 'This diary entry could not be deleted. Please try again.');
      } finally {
        setDeleting(false);
      }
    });
  };

  // Poster sized to leave room for the title, the details and the Edit button on short phones.
  const reserved = showDone ? 520 : 440;
  const posterWidth = Math.round(Math.min(width * 0.44, (height - insets.top - reserved) / 1.5, 200));

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : !entry ? (
        <View style={styles.center}>
          <Text style={[styles.missing, { color: colors.textMuted }]}>
            This viewing could not be found.
          </Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.content, { paddingVertical: 16 }]}
        >
          <Poster
            uri={resolvePoster(library, entry.movieId, entry.title)}
            title={entry.title}
            width={posterWidth}
            radius={RADIUS.lg}
          />

          <Text
            style={[
              styles.title,
              { color: colors.text },
              // Long titles get a smaller size, so the whole name stays visible.
              entry.title.length > 60 ? { fontSize: 21, lineHeight: 27 } : entry.title.length > 32 ? { fontSize: 24, lineHeight: 30 } : null,
            ]}
            numberOfLines={5}
            adjustsFontSizeToFit
            minimumFontScale={0.6}
          >
            {entry.title}
          </Text>
          {place ? (
            <Text style={[styles.place, { color: colors.textMuted }]} numberOfLines={1}>
              {place.district ? `${place.name} · ${place.district}` : place.name}
            </Text>
          ) : null}
          <View style={[styles.rule, { backgroundColor: colors.border }]} />

          <View style={styles.list}>
            <DetailRow icon="calendar" label="Watched on" value={longDate(entry.watchedAt)} />
            {place ? (
              <>
                <View style={[styles.divider, { backgroundColor: colors.border }]} />
                <DetailRow icon="location" label="Theatre" value={place.name} hint={place.district} />
              </>
            ) : null}
            {entry.companion ? (
              <>
                <View style={[styles.divider, { backgroundColor: colors.border }]} />
                <DetailRow
                  icon={entry.companion === 'alone' ? 'person' : 'people'}
                  label="Watched"
                  value={COMPANION_LABELS[entry.companion]}
                />
              </>
            ) : null}
            {entry.price !== undefined ? (
              <>
                <View style={[styles.divider, { backgroundColor: colors.border }]} />
                <DetailRow icon="cash" label="Spent" value={`₹${entry.price.toLocaleString('en-IN')}`} />
              </>
            ) : null}
          </View>

          <View style={styles.actions}>
            <Pressable
              onPress={() =>
                router.navigate({
                  pathname: '/log',
                  params: { editEntryId: entry.id, from: 'diary' },
                })
              }
              accessibilityRole="button"
              accessibilityLabel={`Edit ${entry.title}`}
              style={({ pressed }) => [
                styles.actionButton,
                { borderColor: colors.accent },
                pressed && { opacity: 0.6 },
              ]}
            >
              <EditIcon size={15} color={colors.accent} />
              <Text style={[styles.actionLabel, { color: colors.accent }]}>Edit</Text>
            </Pressable>
            <Pressable
              onPress={handleDelete}
              disabled={deleting}
              accessibilityRole="button"
              accessibilityLabel={`Delete ${entry.title}`}
              style={({ pressed }) => [
                styles.actionButton,
                { borderColor: colors.rose },
                (pressed || deleting) && { opacity: 0.6 },
              ]}
            >
              <Ionicons name="trash-outline" size={17} color={colors.rose} />
              <Text style={[styles.actionLabel, { color: colors.rose }]}>Delete</Text>
            </Pressable>
          </View>
        </ScrollView>
      )}

      {showDone && entry ? (
        <View
          style={[
            styles.footer,
            {
              backgroundColor: colors.background,
              borderTopColor: colors.borderSoft,
              paddingBottom: insets.bottom + 14,
            },
          ]}
        >
          <ActionButton
            label="Done"
            icon="checkmark"
            fullWidth
            onPress={() => router.navigate('/diary')}
          />
        </View>
      ) : null}
      <SavingOverlay visible={deleting} label="Deleting…" />
    </View>
  );
}

function DetailRow({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  value: string;
  /** Smaller line under the value, such as the district. */
  hint?: string;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.row}>
      <View style={styles.iconBadge}>
        <Ionicons name={icon} size={18} color={colors.accent} />
      </View>
      <View style={styles.rowText}>
        <Text style={[styles.rowLabel, { color: colors.textMuted }]}>{label}</Text>
        <Text style={[styles.rowValue, { color: colors.text }]}>{value}</Text>
        {hint ? <Text style={[styles.rowHint, { color: colors.textMuted }]}>{hint}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
  back: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1A2A42',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  missing: {
    ...TYPE.body,
    textAlign: 'center',
  },
  content: {
    // Fills the space and centres the poster and details, so top and bottom gaps are equal.
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
  },
  title: {
    ...TYPE.title,
    fontSize: 28,
    lineHeight: 34,
    textAlign: 'center',
    marginTop: 18,
    // Use the full width and break long words instead of running past the screen edge.
    width: '100%',
    ...({ wordBreak: 'break-word', overflowWrap: 'anywhere' } as object),
  },
  place: {
    ...TYPE.small,
    fontSize: 13,
    marginTop: 4,
    textAlign: 'center',
  },
  rule: {
    width: '60%',
    height: StyleSheet.hairlineWidth * 2,
    marginTop: 16,
    marginBottom: 6,
  },
  list: {
    width: '100%',
  },
  actions: {
    width: '100%',
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  actionButton: {
    flex: 1,
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: RADIUS.pill,
    borderWidth: 1.5,
  },
  actionLabel: {
    fontSize: 14,
    fontWeight: '800',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 56,
    paddingVertical: 8,
  },
  iconBadge: {
    width: 28,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: {
    flex: 1,
    minWidth: 0,
  },
  rowLabel: {
    ...TYPE.eyebrow,
    fontSize: 10,
  },
  rowValue: {
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '700',
    letterSpacing: -0.1,
    marginTop: 1,
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  rowHint: {
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '500',
    marginTop: 1,
  },
  divider: {
    height: StyleSheet.hairlineWidth * 2,
  },
});
