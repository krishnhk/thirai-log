import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RADIUS, useTheme } from '../theme';
import { Poster } from './Poster';
import { pickPosterFromLibrary } from '../lib/posters';
import { notify } from '../lib/ui';

interface PosterPickerProps {
  /** Current poster (TMDB URL or a file URI from a previous pick). */
  uri?: string;
  title: string;
  /** Stable id used to name the stored file. */
  movieId: string;
  width?: number;
  /** Called with the stored file URI after a successful pick. */
  onChange: (uri: string) => void;
  /** When false, shows the poster without the edit control. */
  editable?: boolean;
}

/** Poster tile that opens the photo library to set or replace the poster. */
export function PosterPicker({ uri, title, movieId, width = 84, onChange, editable = true }: PosterPickerProps) {
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
      <Poster uri={uri} title={title} width={width} radius={RADIUS.md}>
        <View style={[styles.badge, { backgroundColor: colors.overlay }]}>
          {busy ? (
            <ActivityIndicator size="small" color={colors.onAccent} />
          ) : (
            <Ionicons name={uri ? 'create-outline' : 'image-outline'} size={14} color={colors.onAccent} />
          )}
        </View>
      </Poster>
    </Pressable>
  );
}

const styles = StyleSheet.create({
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
