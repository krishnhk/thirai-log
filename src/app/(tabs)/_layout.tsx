import React from 'react';
import { Tabs } from 'expo-router';
import { TabBar } from '../../navigation/TabBar';

// Visible tabs: / , /diary, /watchlist, /library, /settings. The log route stays registered (other screens
// navigate to it) but the custom TabBar filters it out, so it has no button in the bar.
// The app always opens on Home, and the Android back button from another tab goes back to Home.
export const unstable_settings = { initialRouteName: 'index' };

export default function TabsLayout() {
  return (
    <Tabs
      backBehavior="initialRoute"
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
      <Tabs.Screen name="watchlist" options={{ tabBarLabel: 'Bucket list' }} />
      <Tabs.Screen name="library" options={{ tabBarLabel: 'Library' }} />
      <Tabs.Screen name="settings" options={{ tabBarLabel: 'Settings' }} />
    </Tabs>
  );
}
