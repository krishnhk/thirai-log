import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Platform, type TextStyle } from 'react-native';
import { DATA_FILES, readJson, updateJson } from '../lib/storage';

export type ThemeMode = 'light' | 'dark';

/** The two themes you can choose in Settings > Appearance. */
export type ThemeName = 'desk-dark' | 'desk-light';

export interface ThemeColors {
  background: string;
  backgroundAlt: string;
  surface: string;
  /** The bottom colour of a card's soft gradient (the same as `surface` in the flat themes). */
  surfaceFade: string;
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
  /** The edge of the floating tab bar, stronger than a card border so the bar never blends into the cards. */
  navBorder: string;
  navActive: string;
  navText: string;
  navTextMuted: string;
  primary: string;
  primaryText: string;
  /** Colour of shadows. */
  shadow: string;
  /** The quiet fill for charts: the bars that are not picked. */
  tint: string;
  /** Small icons that sit softly on a card (for example Solo and Group in the Diary). */
  iconSoft: string;
  /** Watchlist status colours. */
  statusPlanned: string;
  statusWatched: string;
  statusSkipped: string;
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

/** Dark: soft charcoal (not near-black) with slate cards, one red accent for actions and the picked item, quiet borders. */
const DESK_DARK: ThemeColors = {
  background: '#1f2022',
  backgroundAlt: '#2c2f37',
  surface: '#25282f',
  surfaceFade: '#25282f',
  surfaceAlt: '#2c2f37',
  border: '#363942',
  borderSoft: '#2d3037',
  text: '#f2f3f5',
  textMuted: '#8d9097',
  textDim: '#62656c',
  accent: '#e5484d',
  accentSoft: 'rgba(229,72,77,0.16)',
  onAccent: '#FFFFFF',
  gold: '#e5484d',
  goldSoft: 'rgba(229,72,77,0.16)',
  coral: '#e5484d',
  coralSoft: '#30333b',
  coralInk: '#f2f3f5',
  sage: '#43c07f',
  sageSoft: 'rgba(67,192,127,0.13)',
  sageInk: '#bfe9d2',
  teal: '#43c07f',
  blue: '#5fa2f7',
  rose: '#f0605a',
  star: '#f08a3c',
  overlay: 'rgba(0,0,0,0.6)',
  nav: '#32353d',
  navBorder: '#4a4e59',
  navActive: '#e5484d',
  navText: '#FFFFFF',
  navTextMuted: '#8d9097',
  primary: '#e5484d',
  primaryText: '#FFFFFF',
  shadow: '#000000',
  tint: '#3a3d46',
  iconSoft: '#8d9097',
  statusPlanned: '#5fa2f7',
  statusWatched: '#43c07f',
  statusSkipped: '#f0605a',
};

/** ThiraiDesk light: white and slate with the slightly deeper red. */
const DESK_LIGHT: ThemeColors = {
  background: '#f4f6fa',
  backgroundAlt: '#e8ecf2',
  surface: '#FFFFFF',
  surfaceFade: '#FFFFFF',
  surfaceAlt: '#f3f5f9',
  border: '#dde3eb',
  borderSoft: '#e8ecf2',
  text: '#1e293b',
  textMuted: '#5b6779',
  textDim: '#8794a7',
  accent: '#d93a40',
  accentSoft: 'rgba(217,58,64,0.09)',
  onAccent: '#FFFFFF',
  gold: '#d93a40',
  goldSoft: 'rgba(217,58,64,0.12)',
  coral: '#d93a40',
  coralSoft: '#e8ecf2',
  coralInk: '#1e293b',
  sage: '#15803d',
  sageSoft: 'rgba(21,128,61,0.1)',
  sageInk: '#166534',
  teal: '#15803d',
  blue: '#0369a1',
  rose: '#dc2626',
  star: '#b45309',
  overlay: 'rgba(15,23,42,0.45)',
  nav: '#e8ecf2',
  navBorder: '#c6cedb',
  navActive: '#d93a40',
  navText: '#FFFFFF',
  navTextMuted: '#5b6779',
  primary: '#d93a40',
  primaryText: '#FFFFFF',
  shadow: '#0f172a',
  tint: '#d6dce6',
  iconSoft: '#8794a7',
  statusPlanned: '#0369a1',
  statusWatched: '#15803d',
  statusSkipped: '#dc2626',
};

interface ThemeDefinition {
  label: string;
  hint: string;
  mode: ThemeMode;
  colors: ThemeColors;
}

export const THEMES: Record<ThemeName, ThemeDefinition> = {
  'desk-dark': { label: 'Dark', hint: 'Charcoal with a red accent', mode: 'dark', colors: DESK_DARK },
  'desk-light': { label: 'Light', hint: 'White and slate with a red accent', mode: 'light', colors: DESK_LIGHT },
};

export const THEME_ORDER: ThemeName[] = ['desk-dark', 'desk-light'];
const DEFAULT_THEME: ThemeName = 'desk-dark';

interface ThemeContextValue {
  mode: ThemeMode;
  colors: ThemeColors;
  name: ThemeName;
  /** Switches the theme and remembers the choice. */
  setTheme: (name: ThemeName) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  mode: THEMES[DEFAULT_THEME].mode,
  colors: THEMES[DEFAULT_THEME].colors,
  name: DEFAULT_THEME,
  setTheme: () => {},
});

function isThemeName(value: unknown): value is ThemeName {
  // An older saved "classic" choice is no longer offered, so it falls back to the default (dark).
  return value === 'desk-dark' || value === 'desk-light';
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [name, setName] = useState<ThemeName>(DEFAULT_THEME);

  // The saved choice is applied as soon as it has been read (the splash screen covers the short wait).
  useEffect(() => {
    let active = true;
    readJson<{ theme?: unknown }>(DATA_FILES.settings, {})
      .then((saved) => {
        if (active && isThemeName(saved?.theme)) setName(saved.theme);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const setTheme = useCallback((next: ThemeName) => {
    setName(next);
    updateJson<Record<string, unknown>>(DATA_FILES.settings, {}, (current) => ({ ...current, theme: next })).catch(
      () => {
        // The theme still changes for this visit; it just will not be remembered.
      }
    );
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({ mode: THEMES[name].mode, colors: THEMES[name].colors, name, setTheme }),
    [name, setTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

// Removes the browser focus outline on text inputs (web preview). No effect on phones.
export const INPUT_RESET = { outlineStyle: 'none', outlineWidth: 0 } as unknown as TextStyle;

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
