import React, { useCallback, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { INPUT_RESET, RADIUS, NUMBER_FONT, SERIF, SPACE, TYPE, useTheme } from '../theme';
import { useLibrary } from '../hooks/useLibrary';
import {
  THEATRE_DISTRICT_MAX,
  THEATRE_NAME_MAX,
  deleteTheatre,
  dismissLegacyPrompt,
  districtCount,
  groupByDistrict,
  importLegacyTheatres,
  isLegacyPromptDismissed,
  legacyTheatreNames,
  matchesTheatre,
  saveTheatre,
  validateTheatre,
  type LegacyTheatreName,
  type Theatre,
} from '../lib/theatres';
import { confirmAction, holdSaving, notify } from '../lib/ui';
import { ActionButton } from '../components/ActionButton';
import { SavingOverlay } from '../components/SavingOverlay';
import { Card } from '../components/Card';
import { EmptyState } from '../components/EmptyState';
import { EditIcon } from '../components/EditIcon';

/** Visited theatres, grouped by district. Add, edit, delete and search. */
export default function TheatresScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { library, loading, refresh } = useLibrary();
  const [query, setQuery] = useState('');

  // Add / edit form
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Theatre | null>(null);
  const [name, setName] = useState('');
  const [district, setDistrict] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Old free-text theatres
  const [dismissed, setDismissed] = useState<boolean | null>(null);
  const [importOpen, setImportOpen] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      isLegacyPromptDismissed()
        .then((value) => {
          if (active) setDismissed(value);
        })
        .catch(() => {
          if (active) setDismissed(false);
        });
      return () => {
        active = false;
      };
    }, [])
  );

  const theatres = library.theatres;
  const sections = useMemo(
    () => groupByDistrict(theatres.filter((item) => matchesTheatre(item, query))),
    [theatres, query]
  );
  const legacy = useMemo(
    () => legacyTheatreNames(library.entries, theatres),
    [library.entries, theatres]
  );
  // With no theatres at all there is nothing to count or search, so only the "Add a theatre" card shows.
  const noTheatres = !loading && theatres.length === 0;
  const showPrompt = !loading && dismissed === false && legacy.length > 0;

  const openNew = () => {
    setEditing(null);
    setName('');
    setDistrict('');
    setFormError(null);
    setFormOpen(true);
  };

  const openEdit = (theatre: Theatre) => {
    setEditing(theatre);
    setName(theatre.name);
    setDistrict(theatre.district);
    setFormError(null);
    setFormOpen(true);
  };

  // Editing with nothing changed: Save stays disabled.
  const unchanged =
    editing !== null &&
    name.trim() === editing.name.trim() &&
    district.trim() === editing.district.trim();

  const submitForm = async () => {
    if (saving) return;
    const invalid = validateTheatre(name, district);
    if (invalid) {
      setFormError(invalid);
      return;
    }
    setSaving(true);
    const startedAt = Date.now();
    try {
      const result = await saveTheatre({
        id: editing?.id,
        name,
        district,
      });
      if (!result.ok) {
        setFormError(result.error);
        return;
      }
      await refresh();
      await holdSaving(startedAt);
      setFormOpen(false);
    } catch {
      setFormError('Could not save this theatre. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const removeTheatre = () => {
    if (!editing) return;
    const target = editing;
    const used = library.entries.filter((entry) => entry.theatreId === target.id).length;
    const note =
      used > 0
        ? `\n\n${used} ${used === 1 ? 'viewing uses' : 'viewings use'} it and will keep the theatre name.`
        : '';
    confirmAction('Delete theatre', `Delete “${target.name}” from your theatres?${note}`, async () => {
      try {
        await deleteTheatre(target.id);
        await refresh();
        setFormOpen(false);
      } catch {
        notify('Could not delete', 'This theatre could not be deleted. Please try again.');
      }
    });
  };

  const dismissPrompt = async () => {
    setDismissed(true);
    try {
      await dismissLegacyPrompt();
    } catch {
      // The prompt is hidden for this visit; it may come back next time.
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={[styles.title, { color: colors.text }]}>Theatres</Text>
      </View>

      {noTheatres ? null : (
        <View style={styles.summaryRow}>
          <SummaryTile value={theatres.length} label={theatres.length === 1 ? 'Theatre visited' : 'Theatres visited'} tone="blue" />
          <SummaryTile
            value={districtCount(theatres)}
            label={districtCount(theatres) === 1 ? 'District covered' : 'Districts covered'}
            tone="mint"
          />
        </View>
      )}

      {showPrompt ? (
        <Card style={styles.prompt}>
          <Text style={[styles.promptTitle, { color: colors.text }]}>
            Add theatres from your past viewings?
          </Text>
          <Text style={[styles.promptText, { color: colors.textMuted }]}>
            {legacy.length === 1
              ? '1 theatre name'
              : `${legacy.length} theatre names`}{' '}
            typed in earlier viewings can be added to this list. You choose which ones and enter each district.
          </Text>
          <View style={styles.promptActions}>
            <Pressable
              onPress={dismissPrompt}
              accessibilityRole="button"
              style={({ pressed }) => [styles.promptGhost, pressed && { opacity: 0.7 }]}
            >
              <Text style={[styles.promptGhostText, { color: colors.textMuted }]}>Not now</Text>
            </Pressable>
            <ActionButton label="Review" compact onPress={() => setImportOpen(true)} style={styles.promptButton} />
          </View>
        </Card>
      ) : null}

      {noTheatres ? null : (
        <View style={styles.toolbar}>
          <View style={[styles.searchRow, { backgroundColor: colors.backgroundAlt, borderColor: colors.borderSoft }]}>
            <Ionicons name="search" size={16} color={colors.textMuted} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search name or district"
              placeholderTextColor={colors.textMuted}
              autoCorrect={false}
              accessibilityLabel="Search theatres"
              style={[styles.searchInput, INPUT_RESET, { color: colors.text }]}
            />
          </View>
          <ActionButton label="Add" icon="add" compact onPress={openNew} style={styles.addButton} />
        </View>
      )}

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        stickySectionHeadersEnabled={false}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + SPACE.xl }]}
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionTick, { backgroundColor: colors.gold }]} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{section.district}</Text>
            <Text style={[styles.sectionCount, { color: colors.textMuted }]}>{section.data.length}</Text>
          </View>
        )}
        renderItem={({ item }) => (
          <View style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.borderSoft }]}>
            <Pressable
              onPress={() => router.push({ pathname: '/theatre/[theatreId]', params: { theatreId: item.id } })}
              accessibilityRole="button"
              accessibilityLabel={`${item.name}, ${item.district}. Show all visits`}
              style={({ pressed }) => [styles.rowMain, pressed && { opacity: 0.8 }]}
            >
              <View style={[styles.rowIcon, { backgroundColor: colors.coralSoft }]}>
                <Ionicons name="location" size={16} color={colors.coralInk} />
              </View>
              <View style={styles.rowText}>
                <Text style={[styles.rowTitle, { color: colors.text }]}>{item.name}</Text>
              </View>
            </Pressable>
            <Pressable
              hitSlop={8}
              onPress={() => openEdit(item)}
              accessibilityRole="button"
              accessibilityLabel={`Edit ${item.name}, ${item.district}`}
              style={({ pressed }) => [
                styles.editBadge,
                { backgroundColor: colors.surfaceAlt },
                pressed && { opacity: 0.6 },
              ]}
            >
              <EditIcon size={15} color={colors.coralInk} />
            </Pressable>
          </View>
        )}
        ListEmptyComponent={
          loading ? undefined : (
            <EmptyState
              icon="location-outline"
              title={query.trim() ? 'No matching theatres' : 'No theatres yet'}
              message={
                query.trim()
                  ? undefined
                  : 'Add the theatres you have visited. You can then pick them when you log a film.'
              }
              actionLabel={query.trim() ? undefined : 'Add a theatre'}
              onAction={query.trim() ? undefined : openNew}
            />
          )
        }
      />

      {/* Add / edit sheet */}
      <Modal visible={formOpen} transparent animationType="fade" onRequestClose={() => setFormOpen(false)}>
        <View style={[styles.overlay, { backgroundColor: colors.overlay, paddingTop: insets.top + 24 }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setFormOpen(false)} accessibilityLabel="Close" />
          <View style={[styles.sheet, { backgroundColor: colors.background, borderColor: colors.borderSoft }]}>
            <View style={styles.sheetHead}>
              <Text style={[styles.sheetTitle, { color: colors.text }]}>
                {editing ? 'Edit theatre' : 'Add a theatre'}
              </Text>
              <Pressable onPress={() => setFormOpen(false)} accessibilityRole="button" accessibilityLabel="Close" hitSlop={8}>
                <Ionicons name="close" size={22} color={colors.textMuted} />
              </Pressable>
            </View>

            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <Text style={[styles.label, { color: colors.text }]}>
                Theatre name<Text style={{ color: colors.rose }}> *</Text>
              </Text>
              <TextInput
                value={name}
                onChangeText={(text) => {
                  setName(text);
                  setFormError(null);
                }}
                placeholder="e.g. PVR Cinemas"
                placeholderTextColor={colors.textMuted}
                maxLength={THEATRE_NAME_MAX}
                autoFocus={!editing}
                accessibilityLabel="Theatre name, required"
                style={[styles.input, INPUT_RESET, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border }]}
              />

              <Text style={[styles.label, { color: colors.text }]}>
                District<Text style={{ color: colors.rose }}> *</Text>
              </Text>
              <TextInput
                value={district}
                onChangeText={(text) => {
                  setDistrict(text);
                  setFormError(null);
                }}
                placeholder="e.g. Chennai"
                placeholderTextColor={colors.textMuted}
                maxLength={THEATRE_DISTRICT_MAX}
                accessibilityLabel="District, required"
                style={[styles.input, INPUT_RESET, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border }]}
              />

              {formError ? (
                <View style={styles.errorRow} accessibilityRole="alert">
                  <Ionicons name="alert-circle" size={14} color={colors.rose} />
                  <Text style={[styles.errorText, { color: colors.rose }]}>{formError}</Text>
                </View>
              ) : null}
            </ScrollView>

            <View style={styles.sheetActions}>
              {editing ? (
                <Pressable
                  onPress={removeTheatre}
                  accessibilityRole="button"
                  accessibilityLabel="Delete theatre"
                  style={({ pressed }) => [
                    styles.deleteButton,
                    { backgroundColor: `${colors.rose}14`, borderColor: `${colors.rose}66` },
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  <Ionicons name="trash-outline" size={19} color={colors.rose} />
                </Pressable>
              ) : null}
              <ActionButton
                label={editing ? 'Save changes' : 'Save theatre'}
                icon="checkmark"
                onPress={submitForm}
                loading={saving}
                disabled={unchanged}
                style={styles.saveButton}
              />
            </View>
          </View>
          <SavingOverlay visible={saving} />
        </View>
      </Modal>

      <ImportSheet
        visible={importOpen}
        names={legacy}
        onClose={() => setImportOpen(false)}
        onDone={async (allDone) => {
          await refresh();
          if (allDone) {
            await dismissPrompt();
            setImportOpen(false);
          }
        }}
      />
    </View>
  );
}

function SummaryTile({ value, label, tone }: { value: number; label: string; tone: 'blue' | 'mint' }) {
  const { colors } = useTheme();
  const palette =
    tone === 'blue'
      ? { bg: colors.coralSoft, ink: colors.coralInk }
      : { bg: colors.sageSoft, ink: colors.sageInk };
  return (
    <View style={[styles.tile, { backgroundColor: palette.bg }]}>
      <Text style={[styles.tileValue, { color: colors.text }]}>{value}</Text>
      <Text style={[styles.tileLabel, { color: palette.ink }]}>{label}</Text>
    </View>
  );
}

interface ImportSheetProps {
  visible: boolean;
  names: LegacyTheatreName[];
  onClose: () => void;
  /** Called after an import attempt. `allDone` is true when every chosen theatre was added. */
  onDone: (allDone: boolean) => Promise<void>;
}

/** Lets the user pick old free-text theatre names to add, entering a district for each. */
function ImportSheet({ visible, names, onClose, onDone }: ImportSheetProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [picked, setPicked] = useState<Record<string, boolean>>({});
  const [districts, setDistricts] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const keyOf = (item: LegacyTheatreName) => item.name.trim().toLowerCase();

  const submit = async () => {
    if (busy) return;
    const chosen = names.filter((item) => picked[keyOf(item)]);
    if (chosen.length === 0) {
      setMessage('Choose at least one theatre to add.');
      return;
    }
    const nextErrors: Record<string, string> = {};
    chosen.forEach((item) => {
      const problem = validateTheatre(item.name, districts[keyOf(item)] ?? '');
      if (problem) nextErrors[keyOf(item)] = problem;
    });
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      setMessage(null);
      return;
    }

    setBusy(true);
    try {
      const result = await importLegacyTheatres(
        chosen.map((item) => ({ name: item.name, district: districts[keyOf(item)] ?? '' }))
      );
      const failed: Record<string, string> = {};
      result.errors.forEach((entry) => {
        failed[entry.name.trim().toLowerCase()] = entry.error;
      });
      setErrors(failed);
      setMessage(null);
      await onDone(result.errors.length === 0);
    } catch {
      setMessage('Could not add these theatres. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={[styles.overlay, { backgroundColor: colors.overlay, paddingTop: insets.top + 24 }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" />
        <View style={[styles.sheet, styles.importSheet, { backgroundColor: colors.background, borderColor: colors.borderSoft }]}>
          <View style={styles.sheetHead}>
            <Text style={[styles.sheetTitle, { color: colors.text }]}>Add past theatres</Text>
            <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" hitSlop={8}>
              <Ionicons name="close" size={22} color={colors.textMuted} />
            </Pressable>
          </View>
          <Text style={[styles.promptText, { color: colors.textMuted }]}>
            Tick the theatres to add and enter each district. Your earlier viewings keep their text and are linked to the new theatre.
          </Text>

          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} style={styles.importList}>
            {names.map((item) => {
              const key = keyOf(item);
              const on = Boolean(picked[key]);
              return (
                <View
                  key={key}
                  style={[styles.importRow, { backgroundColor: colors.surface, borderColor: colors.borderSoft }]}
                >
                  <Pressable
                    onPress={() => setPicked((prev) => ({ ...prev, [key]: !on }))}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: on }}
                    style={styles.importHead}
                  >
                    <Ionicons
                      name={on ? 'checkbox' : 'square-outline'}
                      size={22}
                      color={on ? colors.primary : colors.textMuted}
                    />
                    <View style={styles.rowText}>
                      <Text style={[styles.rowTitle, { color: colors.text }]}>{item.name}</Text>
                      <Text style={[styles.rowMeta, { color: colors.textMuted }]}>
                        {item.count} {item.count === 1 ? 'viewing' : 'viewings'}
                      </Text>
                    </View>
                  </Pressable>
                  {on ? (
                    <View style={styles.importField}>
                      <TextInput
                        value={districts[key] ?? ''}
                        onChangeText={(text) => {
                          setDistricts((prev) => ({ ...prev, [key]: text }));
                          setErrors((prev) => ({ ...prev, [key]: '' }));
                        }}
                        placeholder="District"
                        placeholderTextColor={colors.textMuted}
                        maxLength={THEATRE_DISTRICT_MAX}
                        accessibilityLabel={`District for ${item.name}`}
                        style={[
                          styles.input,
                          INPUT_RESET,
                          {
                            color: colors.text,
                            backgroundColor: colors.background,
                            borderColor: errors[key] ? colors.rose : colors.border,
                          },
                        ]}
                      />
                      {errors[key] ? <Text style={[styles.errorText, { color: colors.rose }]}>{errors[key]}</Text> : null}
                    </View>
                  ) : null}
                </View>
              );
            })}
          </ScrollView>

          {message ? (
            <View style={styles.errorRow} accessibilityRole="alert">
              <Ionicons name="alert-circle" size={14} color={colors.rose} />
              <Text style={[styles.errorText, { color: colors.rose }]}>{message}</Text>
            </View>
          ) : null}
          <ActionButton
            label="Add selected"
            icon="checkmark"
            fullWidth
            onPress={submit}
            loading={busy}
            style={styles.importSubmit}
          />
        </View>
      </View>
    </Modal>
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
    paddingBottom: 12,
  },
  title: {
    ...TYPE.title,
    fontSize: 24,
    lineHeight: 28,
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
  summaryRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  tile: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: RADIUS.xl,
  },
  tileValue: {
    fontFamily: NUMBER_FONT,
    fontSize: 28,
    lineHeight: 37,
    fontWeight: '400',
    fontVariant: ['tabular-nums'],
  },
  tileLabel: {
    flex: 1,
    fontSize: 12.5,
    lineHeight: 16,
    fontWeight: '800',
  },
  prompt: {
    marginHorizontal: 12,
    marginBottom: 10,
    gap: 6,
  },
  promptTitle: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '800',
  },
  promptText: {
    ...TYPE.small,
  },
  promptActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 4,
  },
  promptGhost: {
    height: 40,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  promptGhostText: {
    fontSize: 14,
    fontWeight: '800',
  },
  promptButton: {
    minHeight: 40,
    paddingHorizontal: 18,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    marginBottom: 6,
  },
  searchRow: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.sm,
    paddingHorizontal: SPACE.md,
    height: 42,
    borderRadius: RADIUS.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  searchInput: {
    ...TYPE.body,
    flex: 1,
    padding: 0,
  },
  addButton: {
    minHeight: 42,
    paddingHorizontal: 16,
  },
  listContent: {
    paddingHorizontal: 12,
    flexGrow: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingTop: 10,
    paddingBottom: 6,
    paddingHorizontal: 4,
  },
  sectionTick: {
    width: 3,
    height: 14,
    borderRadius: 2,
  },
  sectionTitle: {
    flex: 1,
    fontFamily: SERIF,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  sectionCount: {
    fontSize: 12,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 6,
  },
  rowMain: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  rowIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: {
    flex: 1,
    minWidth: 0,
  },
  rowTitle: {
    fontSize: 15,
    lineHeight: 19,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  rowMeta: {
    fontSize: 12.5,
    lineHeight: 16,
    fontWeight: '500',
    marginTop: 2,
  },
  editBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlay: {
    flex: 1,
    paddingHorizontal: 12,
  },
  sheet: {
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    maxHeight: '90%',
    borderRadius: RADIUS.xl,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
  },
  importSheet: {
    flexShrink: 1,
  },
  sheetHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sheetTitle: {
    fontFamily: SERIF,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  label: {
    ...TYPE.caption,
    fontWeight: '800',
    marginTop: 10,
    marginBottom: 6,
  },
  input: {
    ...TYPE.body,
    height: 46,
    paddingHorizontal: SPACE.md,
    borderRadius: RADIUS.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 5,
    marginTop: 10,
  },
  errorText: {
    flex: 1,
    fontSize: 12.5,
    lineHeight: 17,
    fontWeight: '600',
    marginTop: 4,
  },
  sheetActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 14,
  },
  deleteButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButton: {
    flex: 1,
  },
  importList: {
    flexGrow: 0,
    marginTop: 10,
    marginBottom: 6,
  },
  importRow: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 10,
    marginBottom: 6,
  },
  importHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  importField: {
    marginTop: 8,
  },
  importSubmit: {
    marginTop: 8,
  },
});
