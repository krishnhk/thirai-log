import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Platform, type TextStyle } from 'react-native';
import { DATA_FILES, readJson, writeJson } from '../lib/storage';

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

/** Height the docked tab bar occupies, excluding the device safe area. */
export const TAB_BAR_HEIGHT = 76;

/** Editorial serif used for display type and large numbers. */
export const SERIF = Platform.select({
  ios: 'Georgia',
  android: 'serif',
  default: 'Georgia',
}) as string;

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
    fontFamily: SERIF,
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.8,
    fontVariant: ['tabular-nums'],
  },
} as const;

const LIGHT: ThemeColors = {
  background: '#FFF8EF',
  backgroundAlt: '#F6EFE3',
  surface: '#FFFFFF',
  surfaceAlt: '#F3EEE6',
  border: '#E8DFD0',
  borderSoft: 'rgba(20,42,69,0.08)',
  text: '#142A45',
  textMuted: '#788493',
  textDim: '#A3ACB8',
  accent: '#3989CF',
  accentSoft: 'rgba(57,137,207,0.12)',
  onAccent: '#FFFFFF',
  gold: '#D4A03C',
  goldSoft: 'rgba(212,160,60,0.20)',
  coral: '#3989CF',
  coralSoft: '#E4F1F8',
  coralInk: '#174B7A',
  sage: '#3F9A6C',
  sageSoft: '#E5F2E8',
  sageInk: '#2B7550',
  teal: '#2F8A74',
  blue: '#3989CF',
  rose: '#BC4F68',
  star: '#D9A21F',
  overlay: 'rgba(6,20,40,0.58)',
  nav: '#FFFFFF',
  navActive: '#174B7A',
  navText: '#FFFFFF',
  navTextMuted: '#42546C',
  primary: '#174B7A',
  primaryText: '#FFFFFF',
};

const DARK: ThemeColors = {
  background: '#0E1729',
  backgroundAlt: '#14213A',
  surface: '#16243D',
  surfaceAlt: '#1C2D49',
  border: '#2B3D5C',
  borderSoft: 'rgba(255,255,255,0.09)',
  text: '#F8F4EA',
  textMuted: '#AAB6C8',
  textDim: '#7F8CA1',
  accent: '#6CA7E8',
  accentSoft: 'rgba(108,167,232,0.16)',
  onAccent: '#071427',
  gold: '#E9BB60',
  goldSoft: 'rgba(233,187,96,0.18)',
  coral: '#7FB3E0',
  coralSoft: '#173452',
  coralInk: '#B9DCF8',
  sage: '#7FC29C',
  sageSoft: '#18382A',
  sageInk: '#B4E1C4',
  teal: '#67C6B5',
  blue: '#8DBFF6',
  rose: '#FF8BA3',
  star: '#F5CC6A',
  overlay: 'rgba(0,0,0,0.60)',
  nav: '#0A1B33',
  navActive: 'rgba(251,247,237,0.12)',
  navText: '#FBF7ED',
  navTextMuted: 'rgba(251,247,237,0.55)',
  primary: '#6CA7E8',
  primaryText: '#071427',
};

interface ThemeContextValue {
  mode: ThemeMode;
  colors: ThemeColors;
  toggle: () => void;
}

const DEFAULT_CONTEXT: ThemeContextValue = {
  mode: 'light',
  colors: LIGHT,
  toggle: () => {},
};

const ThemeContext = createContext<ThemeContextValue>(DEFAULT_CONTEXT);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>('light');

  useEffect(() => {
    let mounted = true;
    readJson<string | null>(DATA_FILES.theme, null)
      .then((stored) => {
        if (mounted && (stored === 'light' || stored === 'dark')) {
          setMode(stored);
        }
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  const toggle = useCallback(() => {
    setMode((current) => {
      const next: ThemeMode = current === 'dark' ? 'light' : 'dark';
      writeJson(DATA_FILES.theme, next).catch(() => {});
      return next;
    });
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      mode,
      colors: mode === 'dark' ? DARK : LIGHT,
      toggle,
    }),
    [mode, toggle]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

// Removes the browser focus outline on text inputs (web preview). No effect on phones.
export const INPUT_RESET = { outlineStyle: 'none', outlineWidth: 0 } as unknown as TextStyle;

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
