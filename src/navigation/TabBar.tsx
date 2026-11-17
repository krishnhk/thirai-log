import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
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
  statistics: { active: 'stats-chart', inactive: 'stats-chart-outline', label: 'Statistics' },
};

export function TabBar({ state, descriptors, emitter, navigateToTab }: BottomTabBarProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

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
      <View style={[styles.bar, { backgroundColor: colors.nav, borderColor: colors.borderSoft }]}>
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
              <View
                style={[
                  styles.tabInner,
                  focused && { backgroundColor: colors.navActive },
                ]}
              >
                <Ionicons
                  name={focused ? iconSet.active : iconSet.inactive}
                  size={18}
                  color={focused ? colors.navText : colors.navTextMuted}
                />
                <Text
                  style={[
                    styles.label,
                    {
                      color: focused ? colors.navText : colors.navTextMuted,
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
    height: 58,
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 3,
    overflow: 'visible',
    shadowColor: '#142A45',
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
  },
  tabInner: {
    width: 66,
    height: 46,
    borderRadius: 23,
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
    shadowColor: '#3989CF',
    shadowOpacity: 0.4,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
});
