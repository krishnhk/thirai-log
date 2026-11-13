import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
// Type-only import (erased at runtime); expo-router does not re-export this props type from its index.
import type { BottomTabBarProps } from 'expo-router/build/react-navigation/bottom-tabs/types';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RADIUS, TAB_BAR_HEIGHT, TYPE, useTheme } from '../theme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

// Keyed by file-route name (see src/app/(tabs)).
const ICONS: Record<string, { active: IconName; inactive: IconName; label: string }> = {
  index: { active: 'home', inactive: 'home-outline', label: 'Home' },
  diary: { active: 'book', inactive: 'book-outline', label: 'Diary' },
  watchlist: { active: 'bookmark', inactive: 'bookmark-outline', label: 'Watchlist' },
  statistics: { active: 'stats-chart', inactive: 'stats-chart-outline', label: 'Stats' },
};

export function TabBar({ state, descriptors, emitter, navigateToTab }: BottomTabBarProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.shell,
        {
          backgroundColor: colors.surface,
          borderTopColor: colors.borderSoft,
          height: TAB_BAR_HEIGHT + insets.bottom,
          paddingBottom: insets.bottom,
        },
      ]}
    >
      <View style={styles.inner}>
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
                <View
                  style={[
                    styles.logCircle,
                    {
                      backgroundColor: colors.accent,
                      borderColor: colors.background,
                    },
                  ]}
                >
                  <Ionicons name="add" size={26} color={colors.onAccent} />
                </View>
                <Text style={[styles.label, { color: focused ? colors.accent : colors.textMuted }]}>
                  Log
                </Text>
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
                  styles.iconWrap,
                  focused && { backgroundColor: colors.accentSoft },
                ]}
              >
                <Ionicons
                  name={focused ? iconSet.active : iconSet.inactive}
                  size={22}
                  color={focused ? colors.accent : colors.textMuted}
                />
              </View>
              <Text
                style={[
                  styles.label,
                  { color: focused ? colors.text : colors.textMuted, fontWeight: focused ? '800' : '600' },
                ]}
                numberOfLines={1}
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
  shell: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  inner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 6,
    gap: 4,
  },
  iconWrap: {
    width: 48,
    height: 30,
    borderRadius: RADIUS.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    ...TYPE.caption,
    fontSize: 11,
  },
  logCircle: {
    width: 50,
    height: 50,
    borderRadius: RADIUS.pill,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -20,
  },
});
