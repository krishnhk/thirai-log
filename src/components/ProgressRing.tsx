import React from 'react';
import { StyleSheet, View } from 'react-native';

interface ProgressRingProps {
  /** Width and height of the ring. */
  size: number;
  /** Thickness of the ring. */
  stroke: number;
  /** Filled part, from 0 to 1. */
  progress: number;
  color: string;
  trackColor: string;
  /** Shown in the middle of the ring. */
  children?: React.ReactNode;
}

/**
 * A progress ring drawn with plain Views (no SVG needed). The filled arc starts at the top and runs
 * clockwise. It is two half rings: the right half fills first, then the left half.
 */
export function ProgressRing({ size, stroke, progress, color, trackColor, children }: ProgressRingProps) {
  const angle = Math.max(0, Math.min(1, progress)) * 360;
  const rightAngle = Math.min(angle, 180);
  const leftAngle = Math.max(0, angle - 180);
  const half = size / 2;
  const ring = {
    position: 'absolute' as const,
    width: size,
    height: size,
    borderRadius: half,
    borderWidth: stroke,
    borderColor: 'transparent',
  };

  return (
    <View style={{ width: size, height: size }}>
      <View style={[ring, { top: 0, left: 0, borderColor: trackColor }]} />

      {/* Right half: the top and right edges are coloured, turned so the arc ends at the wanted angle. */}
      <View style={[styles.clip, { left: half, width: half, height: size }]}>
        <View
          style={[
            ring,
            {
              left: -half,
              borderTopColor: color,
              borderRightColor: color,
              transform: [{ rotate: `${rightAngle - 135}deg` }],
            },
          ]}
        />
      </View>

      {/* Left half: the bottom and left edges, the same way. */}
      <View style={[styles.clip, { left: 0, width: half, height: size }]}>
        <View
          style={[
            ring,
            {
              left: 0,
              borderBottomColor: color,
              borderLeftColor: color,
              transform: [{ rotate: `${leftAngle - 135}deg` }],
            },
          ]}
        />
      </View>

      <View style={styles.center} pointerEvents="none">
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  clip: {
    position: 'absolute',
    top: 0,
    overflow: 'hidden',
  },
  center: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
