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
import { LinearGradient } from 'expo-linear-gradient';
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
  const discSize = Math.max(22, Math.min(44, Math.round(width * 0.55)));

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
        <LinearGradient
          colors={[`${tint}38`, `${tint}0F`]}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={styles.fallback}
        >
          <View
            pointerEvents="none"
            style={[
              styles.frame,
              { borderColor: `${colors.gold}66`, borderRadius: Math.max(radius - 4, 4) },
            ]}
          />
          <View
            style={[
              styles.iconDisc,
              {
                width: discSize,
                height: discSize,
                borderRadius: discSize / 2,
                backgroundColor: `${tint}26`,
              },
            ]}
          >
            <Ionicons
              name="film-outline"
              size={Math.max(12, Math.round(discSize * 0.42))}
              color={tint}
            />
          </View>
          {width >= 76 ? (
            <Text style={[styles.initials, { color: colors.textMuted }]}>{initials}</Text>
          ) : null}
        </LinearGradient>
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
  frame: {
    position: 'absolute',
    top: 4,
    left: 4,
    right: 4,
    bottom: 4,
    borderWidth: StyleSheet.hairlineWidth,
  },
  iconDisc: {
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
