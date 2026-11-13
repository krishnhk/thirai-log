import React, { useMemo, useState } from 'react';
import {
  Image,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RADIUS, useTheme } from '../theme';

interface PosterProps {
  uri?: string;
  title: string;
  width: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}

function hashText(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function Poster({
  uri,
  title,
  width,
  radius = RADIUS.md,
  style,
  children,
}: PosterProps) {
  const { colors } = useTheme();
  const [failed, setFailed] = useState(false);
  const height = Math.round(width * 1.5);

  const tint = useMemo(() => {
    const palette = [colors.accent, colors.blue, colors.teal, colors.gold, colors.rose];
    return palette[hashText(title) % palette.length];
  }, [title, colors]);

  const initials = useMemo(() => {
    const words = title.trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) return '?';
    if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
    return `${words[0][0]}${words[1][0]}`.toUpperCase();
  }, [title]);

  const showImage = Boolean(uri) && !failed;

  return (
    <View
      style={[
        styles.container,
        {
          width,
          height,
          borderRadius: radius,
          backgroundColor: colors.surfaceAlt,
          borderColor: colors.borderSoft,
        },
        style,
      ]}
    >
      {showImage ? (
        <Image
          source={{ uri }}
          style={styles.image}
          resizeMode="cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <View style={styles.fallback}>
          <View style={[styles.iconDisc, { backgroundColor: `${tint}26` }]}>
            <Ionicons name="film-outline" size={Math.max(16, width * 0.2)} color={tint} />
          </View>
          {width >= 76 ? (
            <Text style={[styles.initials, { color: colors.textMuted }]}>{initials}</Text>
          ) : null}
        </View>
      )}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  fallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  iconDisc: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    marginTop: 6,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2,
  },
});
