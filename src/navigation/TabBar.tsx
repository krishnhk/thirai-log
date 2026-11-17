import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
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

// Active-tab pill. Drawn as one sliding View, so every tab shows the identical capsule shape.
// Active-tab indicator: a slim horizontal capsule attached to the top edge of the bar.
const INDICATOR_WIDTH = 48;
const INDICATOR_HEIGHT = 5;
const TAB_WIDTH = 66;
const TAB_HEIGHT = 46;
const BAR_HEIGHT = 58;
const BAR_PADDING = 3;

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
  // The raised Log button has its own look, so the pill hides while Log is focused.
  const pillVisible = focusedRoute?.name !== 'log';
  const pillX = BAR_PADDING + state.index * tabWidth + (tabWidth - INDICATOR_WIDTH) / 2;

  useEffect(() => {
    if (tabWidth === 0) return;
    if (!placed.current) {
      // First layout: jump straight to the active tab instead of sliding in from the left.
      placed.current = true;
      slide.setValue(pillX);
      fade.setValue(pillVisible ? 1 : 0);
      return;
    }
    Animated.parallel([
      Animated.timing(slide, {
        toValue: pillX,
        duration: 250,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(fade, {
        toValue: pillVisible ? 1 : 0,
        duration: 160,
        useNativeDriver: true,
      }),
    ]).start();
  }, [pillX, pillVisible, tabWidth, slide, fade]);

  // The Edit Viewing form (Log tab opened with an entry id) uses the whole screen.
  const activeRoute = state.routes[state.index];
  const editing =
    activeRoute?.name === 'log' &&
    Boolean((activeRoute.params as Record<string, unknown> | undefined)?.editEntryId);
  if (editing) return null;

  return (
    <View
      style={[
        styles.dock,
        { paddingBottom: insets.bottom > 0 ? insets.bottom + 4 : 10 },
      ]}
    >
      <View
        onLayout={(event) => setBarWidth(event.nativeEvent.layout.width)}
        style={[styles.bar, { backgroundColor: colors.nav, borderColor: colors.borderSoft }]}
      >
        <Animated.View
          pointerEvents="none"
          style={[
            styles.pill,
            {
              backgroundColor: colors.accent,
              opacity: fade,
              transform: [{ translateX: slide }],
            },
          ]}
        />
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const isLog = route.name === 'log';
          const meta = ICONS[route.name];
          const label =
            descriptors[route.key]?.options.tabBarLabel?.toString() ?? meta?.label ?? route.name;

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
                <View style={styles.logStack}>
                  <View
                    style={[
                      styles.logCircle,
                      { backgroundColor: colors.accent, borderColor: colors.nav },
                    ]}
                  >
                    <Ionicons name="add" size={26} color={colors.onAccent} />
                  </View>
                  <Text
                    style={[
                      styles.label,
                      { color: colors.text, fontWeight: focused ? '800' : '600' },
                    ]}
                  >
                    Log
                  </Text>
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
              <View style={styles.tabInner}>
                <Ionicons
                  name={focused ? iconSet.active : iconSet.inactive}
                  size={18}
                  color={focused ? colors.accent : colors.navTextMuted}
                />
                <Text
                  style={[
                    styles.label,
                    {
                      color: focused ? colors.accent : colors.navTextMuted,
                      fontWeight: focused ? '800' : '600',
                    },
                  ]}
                  numberOfLines={1}
                >
                  {label}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  dock: {
    paddingHorizontal: 9,
  },
  bar: {
    height: BAR_HEIGHT,
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: BAR_PADDING,
    overflow: 'visible',
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
    // Web only: no browser focus rectangle around the tab (the pill already marks the active tab).
    outlineStyle: 'none',
  } as object,
  pill: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: INDICATOR_WIDTH,
    height: INDICATOR_HEIGHT,
    // Fully rounded ends: a semicircle at each side.
    borderRadius: 999,
  },
  tabInner: {
    width: TAB_WIDTH,
    height: TAB_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  label: {
    fontSize: 10.5,
    lineHeight: 12,
    fontWeight: '600',
    letterSpacing: 0,
  },
  logStack: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
    marginTop: -24,
  },
  logCircle: {
    width: 50,
    height: 50,
    borderRadius: RADIUS.pill,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#3B5F94',
    shadowOpacity: 0.4,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
});
