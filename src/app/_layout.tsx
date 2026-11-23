import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AnimatedSplash } from '../components/AnimatedSplash';
import { useFonts } from 'expo-font';
import { Righteous_400Regular } from '@expo-google-fonts/righteous';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider as NavigationThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider, useTheme } from '../theme';

// The native splash stays up until the title font is ready (at most this long); then the animated splash plays.
const FONT_WAIT_MS = 1500;
SplashScreen.preventAutoHideAsync().catch(() => {});

const styles = StyleSheet.create({
  root: { flex: 1 },
});

function RootNavigator() {
  const { colors, mode } = useTheme();

  const navigationTheme = useMemo(() => {
    const base = mode === 'dark' ? DarkTheme : DefaultTheme;
    return {
      ...base,
      dark: mode === 'dark',
      colors: {
        ...base.colors,
        primary: colors.accent,
        background: colors.background,
        card: colors.surface,
        text: colors.text,
        border: colors.border,
        notification: colors.accent,
      },
    };
  }, [colors, mode]);

  return (
    <NavigationThemeProvider value={navigationTheme}>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="viewing/[entryId]" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="add-movie" options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="films" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="film/[filmId]" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="theatre/[theatreId]" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="watch-item/[itemId]" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="theatres" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="statistics" options={{ animation: 'slide_from_right' }} />
      </Stack>
    </NavigationThemeProvider>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({ Righteous_400Regular });
  const [fontWaitOver, setFontWaitOver] = useState(false);
  const [splashDone, setSplashDone] = useState(false);

  // Never wait for the font for more than FONT_WAIT_MS, so a slow font cannot hold the app back.
  useEffect(() => {
    const timer = setTimeout(() => setFontWaitOver(true), FONT_WAIT_MS);
    return () => clearTimeout(timer);
  }, []);

  // The native splash is plain denim; once the font is ready, the animated splash takes over from it.
  const ready = fontsLoaded || !!fontError || fontWaitOver;
  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  const finishSplash = useCallback(() => setSplashDone(true), []);

  return (
    <ThemeProvider>
      <View style={styles.root}>
        <RootNavigator />
        {ready && !splashDone ? <AnimatedSplash onDone={finishSplash} /> : null}
      </View>
    </ThemeProvider>
  );
}
