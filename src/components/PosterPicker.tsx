import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RADIUS, useTheme } from '../theme';
import { Poster } from './Poster';
import { pickPosterFromLibrary } from '../lib/posters';
import { notify } from '../lib/ui';
import { EditIcon } from './EditIcon';

interface PosterPickerProps {
  /** Current poster (a web link or a file URI from a previous pick). */
  uri?: string;
  title: string;
  /** Stable id used to name the stored file. */
  movieId: string;
  width?: number;
  /** Called with the stored file URI after a successful pick. */
  onChange: (uri: string) => void;
  /** When false, shows the poster without the edit control. */
  editable?: boolean;
  /** Shows a dashed upload placeholder instead of the generic poster tile when there is no image. */
  uploadPlaceholder?: boolean;
}

/** Poster tile that opens the photo library to set or replace the poster. */
export function PosterPicker({
  uri,
  title,
  movieId,
  width = 84,
  onChange,
  editable = true,
  uploadPlaceholder,
}: PosterPickerProps) {
  const { colors } = useTheme();
  const [busy, setBusy] = useState(false);

  if (!editable) {
    return <Poster uri={uri} title={title} width={width} radius={RADIUS.md} />;
  }

  const pick = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const picked = await pickPosterFromLibrary(movieId);
      if (picked) onChange(picked);
    } catch {
      notify('Could not add poster', 'Please try choosing the image again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Pressable
      onPress={pick}
      accessibilityRole="button"
      accessibilityLabel={uri ? 'Change poster' : 'Add poster'}
    >
      {!uri && uploadPlaceholder ? (
        <View
          style={[
            styles.placeholder,
            {
              width,
              height: Math.round(width * 1.5),
              borderColor: `${colors.accent}88`,
              backgroundColor: colors.accentSoft,
            },
          ]}
        >
          {busy ? (
            <ActivityIndicator size="small" color={colors.coralInk} />
          ) : (
            <Ionicons name="cloud-upload-outline" size={28} color={colors.coralInk} />
          )}
          <Text style={[styles.placeholderTitle, { color: colors.coralInk }]}>Upload poster</Text>
          <Text style={[styles.placeholderHint, { color: colors.textMuted }]}>Optional</Text>
        </View>
      ) : (
      <Poster uri={uri} title={title} width={width} radius={RADIUS.md}>
        <View style={[styles.badge, { backgroundColor: colors.overlay }]}>
          {busy ? (
            <ActivityIndicator size="small" color={colors.onAccent} />
          ) : (
            uri ? (
              <EditIcon size={13} color={colors.onAccent} />
            ) : (
              <Ionicons name="image-outline" size={14} color={colors.onAccent} />
            )
          )}
        </View>
      </Poster>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  placeholder: {
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    padding: 6,
  },
  placeholderTitle: {
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
  },
  placeholderHint: {
    fontSize: 10.5,
    fontWeight: '600',
  },
  badge: {
    position: 'absolute',
    right: 6,
    bottom: 6,
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
