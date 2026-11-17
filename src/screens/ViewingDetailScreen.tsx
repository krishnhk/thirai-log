import React from 'react';
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
import { resolvePoster } from '../lib/library';
import { MONTH_NAMES, toDate } from '../lib/format';
import { Poster } from '../components/Poster';
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
  const { library, loading } = useLibrary();

  const entry = library.entries.find((item) => item.id === entryId);
  const theatre = entry?.theatre?.trim();

  // Large poster that still leaves room for the text on short phones.
  const reserved = showDone ? 400 : 330;
  const posterWidth = Math.round(Math.min(width * 0.6, (height - insets.top - reserved) / 1.5, 280));

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.navigate('/diary');
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Pressable
          onPress={goBack}
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
      </View>

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
          contentContainerStyle={[styles.content, { paddingBottom: 24 }]}
        >
          <View
            style={[
              styles.posterShadow,
              { shadowColor: colors.primary, borderRadius: RADIUS.xl },
            ]}
          >
            <Poster
              uri={resolvePoster(library, entry.movieId, entry.title)}
              title={entry.title}
              width={posterWidth}
              radius={RADIUS.xl}
            />
          </View>

          <Text style={[styles.title, { color: colors.text }]}>{entry.title}</Text>
          <View style={[styles.rule, { backgroundColor: colors.gold }]} />

          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.borderSoft }]}>
            <DetailRow
              icon="calendar"
              label="Watched on"
              value={longDate(entry.watchedAt)}
            />
            {theatre ? (
              <>
                <View style={[styles.divider, { backgroundColor: colors.borderSoft }]} />
                <DetailRow icon="location" label="Theatre" value={theatre} />
              </>
            ) : null}
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
    </View>
  );
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  value: string;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.row}>
      <View style={[styles.iconBadge, { backgroundColor: colors.coralSoft }]}>
        <Ionicons name={icon} size={17} color={colors.coralInk} />
      </View>
      <View style={styles.rowText}>
        <Text style={[styles.rowLabel, { color: colors.textMuted }]}>{label}</Text>
        <Text style={[styles.rowValue, { color: colors.text }]}>{value}</Text>
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
    shadowColor: '#142A45',
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
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
  },
  posterShadow: {
    shadowOpacity: 0.28,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 12 },
    elevation: 10,
  },
  title: {
    ...TYPE.title,
    fontSize: 28,
    lineHeight: 34,
    textAlign: 'center',
    marginTop: 20,
  },
  rule: {
    width: 36,
    height: 2,
    borderRadius: 1,
    marginTop: 10,
    marginBottom: 16,
  },
  card: {
    width: '100%',
    borderRadius: RADIUS.xl,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 4,
    shadowColor: '#142A45',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 56,
    paddingVertical: 8,
  },
  iconBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
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
  divider: {
    height: StyleSheet.hairlineWidth * 2,
  },
});
