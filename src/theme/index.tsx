import React, { createContext, useContext, useMemo } from 'react';
import { Platform, type TextStyle } from 'react-native';

export type ThemeMode = 'light' | 'dark';

export interface ThemeColors {
  background: string;
  backgroundAlt: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  borderSoft: string;
  text: string;
  textMuted: string;
  textDim: string;
  accent: string;
  accentSoft: string;
  onAccent: string;
  gold: string;
  goldSoft: string;
  coral: string;
  coralSoft: string;
  coralInk: string;
  sage: string;
  sageSoft: string;
  sageInk: string;
  teal: string;
  blue: string;
  rose: string;
  star: string;
  overlay: string;
  nav: string;
  navActive: string;
  navText: string;
  navTextMuted: string;
  primary: string;
  primaryText: string;
}

export const SPACE = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  xxxl: 36,
} as const;

export const RADIUS = {
  sm: 8,
  md: 10,
  lg: 14,
  xl: 18,
  pill: 999,
} as const;

/** Editorial serif used for display type and large numbers. */
export const SERIF = Platform.select({
  ios: 'Georgia',
  android: 'serif',
  default: 'Georgia',
}) as string;

/** The rounded display face (same as the logo) used for every figure in the app. Loaded in app/_layout. */
export const NUMBER_FONT = 'Righteous_400Regular';

/** One scale for the whole app, so screens stop inventing font sizes. */
export const TYPE = {
  display: { fontFamily: SERIF, fontSize: 30, fontWeight: '700', letterSpacing: -0.8 },
  title: { fontFamily: SERIF, fontSize: 24, fontWeight: '700', letterSpacing: -0.5 },
  heading: { fontSize: 16, fontWeight: '700', letterSpacing: -0.2 },
  body: { fontSize: 14, fontWeight: '500', lineHeight: 20 },
  small: { fontSize: 12.5, fontWeight: '500', lineHeight: 18 },
  caption: { fontSize: 12, fontWeight: '600', letterSpacing: 0.1 },
  eyebrow: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.6,
    textTransform: 'uppercase',
  },
  number: {
    fontFamily: NUMBER_FONT,
    fontSize: 28,
    fontWeight: '400',
    letterSpacing: 0,
    fontVariant: ['tabular-nums'],
  },
} as const;

const LIGHT: ThemeColors = {
  background: '#FAF5EA',
  backgroundAlt: '#EFE6D5',
  surface: '#FFFFFF',
  surfaceAlt: '#F3ECDD',
  border: '#E6DCC8',
  borderSoft: 'rgba(26,42,66,0.08)',
  text: '#1A2A42',
  textMuted: '#66748B',
  textDim: '#9AA5B6',
  accent: '#3B5F94',
  accentSoft: 'rgba(59,95,148,0.12)',
  onAccent: '#FFFFFF',
  gold: '#7C98C0',
  goldSoft: 'rgba(124,152,192,0.2)',
  coral: '#3B5F94',
  coralSoft: '#DEE6F3',
  coralInk: '#2B4670',
  sage: '#3B5F94',
  sageSoft: '#E4EAF3',
  sageInk: '#2B4670',
  teal: '#3B5F94',
  blue: '#3B5F94',
  rose: '#BC4F68',
  star: '#3B5F94',
  overlay: 'rgba(18,30,50,0.58)',
  nav: '#FFFFFF',
  navActive: '#2B4670',
  navText: '#FFFFFF',
  navTextMuted: '#5A6882',
  primary: '#3B5F94',
  primaryText: '#FFFFFF',
};

interface ThemeContextValue {
  mode: ThemeMode;
  colors: ThemeColors;
}

// The app has a single light theme.
const DEFAULT_CONTEXT: ThemeContextValue = {
  mode: 'light',
  colors: LIGHT,
};

const ThemeContext = createContext<ThemeContextValue>(DEFAULT_CONTEXT);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const value = useMemo<ThemeContextValue>(() => ({ mode: 'light', colors: LIGHT }), []);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

// Removes the browser focus outline on text inputs (web preview). No effect on phones.
export const INPUT_RESET = { outlineStyle: 'none', outlineWidth: 0 } as unknown as TextStyle;

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
