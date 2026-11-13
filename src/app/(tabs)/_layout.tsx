import React from 'react';
import { Tabs } from 'expo-router';
import { TabBar } from '../../navigation/TabBar';

// Declared in the same order as the original tab bar. Routes map to: / , /diary, /log, /watchlist, /statistics.
export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
        animation: 'fade',
      }}
    >
      <Tabs.Screen name="index" options={{ tabBarLabel: 'Home' }} />
      <Tabs.Screen name="diary" options={{ tabBarLabel: 'Diary' }} />
      <Tabs.Screen name="log" options={{ tabBarLabel: 'Log' }} />
      <Tabs.Screen name="watchlist" options={{ tabBarLabel: 'Watchlist' }} />
      <Tabs.Screen name="statistics" options={{ tabBarLabel: 'Statistics' }} />
    </Tabs>
  );
}
