import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
// Type-only import (erased at runtime); expo-router does not re-export this props type from its index.
import type { BottomTabBarProps } from 'expo-router/build/react-navigation/bottom-tabs/types';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RADIUS, useTheme } from '../theme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

// Keyed by file-route name (see src/app/(tabs)).
const ICONS: Record<string, { active: IconName; inactive: IconName; label: string }> = {
  index: { active: 'home', inactive: 'home-outline', label: 'Home' },
  diary: { active: 'book', inactive: 'book-outline', label: 'Diary' },
  watchlist: { active: 'bookmark', inactive: 'bookmark-outline', label: 'Watchlist' },
  library: { active: 'albums', inactive: 'albums-outline', label: 'Library' },
};

// A floating white card with rounded corners and icons only. The active icon turns denim and fills, and one
// short dash slides under it. Log is a denim rounded square in the same row.
const BAR_HEIGHT = 58;
const BAR_PADDING = 6;
const DASH_WIDTH = 18;
const DASH_HEIGHT = 4;
const BAR_RADIUS = 22;
const LOG_SIZE = 46;
const LOG_RADIUS = 15;

export function TabBar({ state, descriptors, emitter, navigateToTab }: BottomTabBarProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const [barWidth, setBarWidth] = useState(0);
  const [slide] = useState(() => new Animated.Value(0));
  const [fade] = useState(() => new Animated.Value(1));
  const placed = useRef(false);

  const count = state.routes.length;
  const tabWidth = barWidth > 0 ? (barWidth - BAR_PADDING * 2) / count : 0;
  const focusedRoute = state.routes[state.index];
  // Log has its own look, so the dash hides while Log is the focused tab.
  const dashVisible = focusedRoute?.name !== 'log';
  const dashX = BAR_PADDING + state.index * tabWidth + (tabWidth - DASH_WIDTH) / 2;

  useEffect(() => {
    if (tabWidth === 0) return;
    if (!placed.current) {
      // First layout: jump straight to the active tab instead of sliding in from the left.
      placed.current = true;
      slide.setValue(dashX);
      fade.setValue(dashVisible ? 1 : 0);
      return;
    }
    Animated.parallel([
      Animated.timing(slide, {
        toValue: dashX,
        duration: 250,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(fade, {
        toValue: dashVisible ? 1 : 0,
        duration: 160,
        useNativeDriver: true,
      }),
    ]).start();
  }, [dashX, dashVisible, tabWidth, slide, fade]);

  // The Edit Viewing form (Log tab opened with an entry id) uses the whole screen.
  const activeRoute = state.routes[state.index];
  const editing =
    activeRoute?.name === 'log' &&
    Boolean((activeRoute.params as Record<string, unknown> | undefined)?.editEntryId);
  if (editing) return null;

  return (
    <View style={[styles.dock, { paddingBottom: insets.bottom > 0 ? insets.bottom + 4 : 10 }]}>
      <View
        onLayout={(event) => setBarWidth(event.nativeEvent.layout.width)}
        style={[styles.bar, { backgroundColor: colors.nav, borderColor: colors.borderSoft }]}
      >
        <Animated.View
          pointerEvents="none"
          style={[
            styles.dash,
            { backgroundColor: colors.accent, opacity: fade, transform: [{ translateX: slide }] },
          ]}
        />
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const isLog = route.name === 'log';
          const meta = ICONS[route.name];
          const label = descriptors[route.key]?.options.tabBarLabel?.toString() ?? meta?.label ?? route.name;

          const onPress = () => {
            const event = emitter.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!focused && !event.defaultPrevented) {
              navigateToTab(route.key);
            }
          };

          const onLongPress = () => {
            emitter.emit({ type: 'tabLongPress', target: route.key });
          };

          if (isLog) {
            return (
              <Pressable
                key={route.key}
                accessibilityRole="button"
                accessibilityState={focused ? { selected: true } : {}}
                accessibilityLabel="Log a viewing"
                onPress={onPress}
                onLongPress={onLongPress}
                style={styles.tab}
              >
                <View style={[styles.logTile, { backgroundColor: colors.accent }]}>
                  <Ionicons name="add" size={28} color={colors.onAccent} />
                </View>
              </Pressable>
            );
          }

          const iconSet = meta ?? { active: 'ellipse', inactive: 'ellipse-outline' };
          return (
            <Pressable
              key={route.key}
              accessibilityRole="button"
              accessibilityLabel={label}
              accessibilityState={focused ? { selected: true } : {}}
              onPress={onPress}
              onLongPress={onLongPress}
              style={styles.tab}
            >
              <Ionicons
                name={focused ? iconSet.active : iconSet.inactive}
                size={24}
                color={focused ? colors.accent : colors.navTextMuted}
              />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  dock: {
    paddingHorizontal: 12,
  },
  bar: {
    height: BAR_HEIGHT,
    borderRadius: BAR_RADIUS,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: BAR_PADDING,
    shadowColor: '#1A2A42',
    shadowOpacity: 0.14,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 16,
  },
  tab: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    // Web only: no browser focus rectangle around the tab (the dash already marks the active tab).
    outlineStyle: 'none',
  } as object,
  dash: {
    position: 'absolute',
    left: 0,
    bottom: 7,
    width: DASH_WIDTH,
    height: DASH_HEIGHT,
    borderRadius: RADIUS.pill,
  },
  logTile: {
    width: LOG_SIZE,
    height: LOG_SIZE,
    borderRadius: LOG_RADIUS,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#3B5F94',
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
});
