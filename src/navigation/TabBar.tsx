import React from 'react';
import { Image, type ImageSourcePropType, Pressable, StyleSheet, Text, View } from 'react-native';
// Type-only import (erased at runtime); expo-router does not re-export this props type from its index.
import type { BottomTabBarProps } from 'expo-router/build/react-navigation/bottom-tabs/types';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme';

// The bar's own icons: white drawings on a transparent background (outline when idle, filled when active),
// tinted with the theme colour. Generated at 96px for a 24px icon. Keyed by file-route name (see src/app/(tabs)).
const ICONS: Record<string, { active: ImageSourcePropType; inactive: ImageSourcePropType; label: string }> = {
  index: {
    active: require('../../assets/icons/nav-home-active.png'),
    inactive: require('../../assets/icons/nav-home.png'),
    label: 'Home',
  },
  diary: {
    active: require('../../assets/icons/nav-diary-active.png'),
    inactive: require('../../assets/icons/nav-diary.png'),
    label: 'Diary',
  },
  watchlist: {
    active: require('../../assets/icons/nav-bucket-active.png'),
    inactive: require('../../assets/icons/nav-bucket.png'),
    label: 'Bucket list',
  },
  library: {
    active: require('../../assets/icons/nav-library-active.png'),
    inactive: require('../../assets/icons/nav-library.png'),
    label: 'Library',
  },
  settings: {
    active: require('../../assets/icons/nav-settings-active.png'),
    inactive: require('../../assets/icons/nav-settings.png'),
    label: 'Settings',
  },
};

// Left to right: Bucket list and Diary, Home in the middle, then Library and Settings. The hidden `log` route is not
// listed. Home stays the first declared route, so it is still where the app opens.
const DISPLAY_ORDER = ['watchlist', 'diary', 'index', 'library', 'settings'];

// A floating card with rounded corners: an icon with its name under it. The active tab's icon fills and both turn
// the accent colour. The log route is hidden from the bar.
const BAR_HEIGHT = 62;
const BAR_PADDING = 6;
const BAR_RADIUS = 22;

export function TabBar({ state, descriptors, emitter, navigateToTab }: BottomTabBarProps) {
  const { colors, mode } = useTheme();
  const insets = useSafeAreaInsets();

  // Shown in DISPLAY_ORDER (Home in the middle), whatever order the routes are declared in.
  const visibleRoutes = DISPLAY_ORDER.map((name) => state.routes.find((route) => route.name === name)).filter(
    (route): route is (typeof state.routes)[number] => route !== undefined
  );
  const focusedRoute = state.routes[state.index];

  // The Edit Viewing form (Log tab opened with an entry id) uses the whole screen.
  const activeRoute = state.routes[state.index];
  const editing =
    activeRoute?.name === 'log' &&
    Boolean((activeRoute.params as Record<string, unknown> | undefined)?.editEntryId);
  if (editing) return null;

  return (
    <View style={[styles.dock, { paddingBottom: insets.bottom > 0 ? insets.bottom + 4 : 10 }]}>
      <View
        style={[
          styles.bar,
          // A colour and edge of its own (not the card colour), and a deeper shadow in dark mode.
          { backgroundColor: colors.nav, borderColor: colors.navBorder, shadowOpacity: mode === 'dark' ? 0.55 : 0.18 },
        ]}
      >
        {visibleRoutes.map((route) => {
          const focused = focusedRoute?.key === route.key;
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
              {meta ? (
                <Image
                  source={focused ? meta.active : meta.inactive}
                  style={[styles.icon, { tintColor: focused ? colors.accent : colors.navTextMuted }]}
                  resizeMode="contain"
                />
              ) : null}
              {/* The name in small text under the icon, in the same colour as the icon. */}
              <Text
                numberOfLines={1}
                style={[styles.label, { color: focused ? colors.accent : colors.navTextMuted }]}
              >
                {label}
              </Text>
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
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: BAR_PADDING,
    shadowColor: '#1A2A42',
    shadowOpacity: 0.14,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 16,
  },
  icon: {
    width: 24,
    height: 24,
  },
  label: {
    fontSize: 10.5,
    lineHeight: 13,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
  tab: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    // Web only: no browser focus rectangle around the tab (the filled icon and coloured name already mark the active tab).
    outlineStyle: 'none',
  } as object,
});
