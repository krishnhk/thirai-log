import React from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SPACE, useTheme } from '../theme';
import { Poster } from './Poster';
import { RatingStars } from './RatingStars';
import type { EntryStatus } from '../lib/library';
import { StatusPill } from './StatusPill';

interface PosterCardProps {
  title: string;
  posterPath?: string;
  meta?: string;
  rating?: number;
  status?: EntryStatus;
  width?: number;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

export function PosterCard({
  title,
  posterPath,
  meta,
  rating,
  status,
  width = 132,
  onPress,
  style,
}: PosterCardProps) {
  const { colors } = useTheme();

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={[styles.container, { width }, style]}
    >
      <Poster uri={posterPath} title={title} width={width} radius={14}>
        {typeof rating === 'number' && rating > 0 ? (
          <View style={[styles.ratingBadge, { backgroundColor: colors.overlay }]}>
            <Ionicons name="star" size={10} color={colors.star} />
            <Text style={styles.ratingText}>{rating.toFixed(1)}</Text>
          </View>
        ) : null}
        {status ? (
          <View style={styles.statusBadge}>
            <StatusPill status={status} small />
          </View>
        ) : null}
        <View style={styles.posterShade} pointerEvents="none" />
      </Poster>
      <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
        {title}
      </Text>
      {meta ? (
        <Text style={[styles.meta, { color: colors.textDim }]} numberOfLines={1}>
          {meta}
        </Text>
      ) : null}
      {typeof rating === 'number' && rating > 0 ? (
        <View style={styles.stars}>
          <RatingStars value={rating} size={11} />
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    marginRight: SPACE.md,
  },
  ratingBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 999,
  },
  ratingText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  statusBadge: {
    position: 'absolute',
    left: 7,
    bottom: 7,
  },
  posterShade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '34%',
    backgroundColor: 'transparent',
  },
  title: {
    fontSize: 12.5,
    fontWeight: '700',
    marginTop: SPACE.sm,
    lineHeight: 16,
  },
  meta: {
    fontSize: 10.5,
    fontWeight: '500',
    marginTop: 3,
  },
  stars: {
    marginTop: 4,
  },
});
