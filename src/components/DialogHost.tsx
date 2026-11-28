import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RADIUS, SERIF, useTheme } from '../theme';
import { subscribeDialogs, type DialogSpec } from '../lib/ui';

/**
 * Draws every confirmation and notice inside the app, in the app's own style, instead of the system's
 * plain dialog. It lives once in the app root; `confirmAction` and `notify` in lib/ui send popups here.
 * Popups that arrive while one is open wait in line and appear one after another.
 */
export function DialogHost() {
  const { colors } = useTheme();
  const [current, setCurrent] = useState<DialogSpec | null>(null);
  const queue = useRef<DialogSpec[]>([]);
  const busy = useRef(false);
  const [progress] = useState(() => new Animated.Value(0));

  const open = useCallback(
    (spec: DialogSpec) => {
      busy.current = true;
      setCurrent(spec);
      progress.setValue(0);
      Animated.timing(progress, {
        toValue: 1,
        duration: 200,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    },
    [progress]
  );

  // One subscription for the life of the app. A popup that arrives while another is showing waits in line.
  useEffect(
    () =>
      subscribeDialogs((spec) => {
        if (busy.current) queue.current.push(spec);
        else open(spec);
      }),
    [open]
  );

  const closing = useRef(false);

  /** Fades the popup out, then runs `after` (the chosen action) and shows the next one in line. */
  const close = useCallback(
    (after?: () => void) => {
      if (closing.current) return;
      closing.current = true;
      Animated.timing(progress, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }).start(() => {
        setCurrent(null);
        busy.current = false;
        closing.current = false;
        after?.();
        const next = queue.current.shift();
        if (next) open(next);
      });
    },
    [open, progress]
  );

  if (!current) return null;
  const tone = current.danger ? colors.rose : colors.accent;
  let iconName: React.ComponentProps<typeof Ionicons>['name'] = 'information-circle-outline';
  if (current.cancellable) iconName = current.danger ? 'trash-outline' : 'help-circle-outline';

  return (
    <Modal transparent visible animationType="none" statusBarTranslucent onRequestClose={() => close()}>
      <Animated.View style={[styles.scrim, { opacity: progress, backgroundColor: colors.overlay }]}>
        <Pressable
          style={styles.fill}
          onPress={() => {
            if (current.cancellable) close();
          }}
          accessibilityLabel="Dismiss"
        />
      </Animated.View>
      <View style={styles.center} pointerEvents="box-none">
        <Animated.View
          accessibilityRole="alert"
          style={[
            styles.card,
            {
              backgroundColor: colors.surface,
              borderColor: colors.borderSoft,
              shadowColor: colors.shadow,
              opacity: progress,
              transform: [{ scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }) }],
            },
          ]}
        >
          <View style={[styles.badge, { backgroundColor: `${tone}1F` }]}>
            <Ionicons name={iconName} size={22} color={tone} />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>{current.title}</Text>
          {current.message ? (
            <Text style={[styles.message, { color: colors.textMuted }]}>{current.message}</Text>
          ) : null}

          <View style={styles.buttons}>
            {current.cancellable ? (
              <Pressable
                onPress={() => close()}
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.button,
                  { borderColor: colors.border, backgroundColor: colors.surface },
                  pressed && styles.pressed,
                ]}
              >
                <Text style={[styles.buttonLabel, { color: colors.text }]}>Cancel</Text>
              </Pressable>
            ) : null}
            <Pressable
              onPress={() => close(current.onConfirm)}
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.button,
                { backgroundColor: tone, borderColor: tone },
                pressed && styles.pressed,
              ]}
            >
              <Text style={[styles.buttonLabel, { color: colors.onAccent }]}>{current.confirmLabel}</Text>
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  fill: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 26,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 18,
    alignItems: 'center',
    shadowColor: '#1A2A42',
    shadowOpacity: 0.25,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 12,
  },
  badge: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  title: {
    fontFamily: SERIF,
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '700',
    letterSpacing: -0.3,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 8,
  },
  buttons: {
    flexDirection: 'row',
    gap: 10,
    alignSelf: 'stretch',
    marginTop: 20,
  },
  button: {
    flex: 1,
    height: 46,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  buttonLabel: {
    fontSize: 14.5,
    fontWeight: '800',
  },
  pressed: {
    opacity: 0.75,
  },
});
