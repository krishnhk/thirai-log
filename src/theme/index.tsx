import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { TextStyle } from 'react-native';
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
  gold: string;
  teal: string;
  blue: string;
  rose: string;
  star: string;
  onAccent: string;
  overlay: string;
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
  md: 12,
  lg: 18,
  xl: 24,
  pill: 999,
} as const;

/** Floating tab bar height, excluding the device safe area. */
export const TAB_BAR_HEIGHT = 68;

/** One scale for the whole app, so screens stop inventing font sizes. */
export const TYPE = {
  display: { fontSize: 32, fontWeight: '800', letterSpacing: -0.8 },
  title: { fontSize: 24, fontWeight: '800', letterSpacing: -0.5 },
  heading: { fontSize: 17, fontWeight: '700', letterSpacing: -0.2 },
  body: { fontSize: 15, fontWeight: '500', lineHeight: 21 },
  small: { fontSize: 13, fontWeight: '500', lineHeight: 18 },
  caption: { fontSize: 12, fontWeight: '600', letterSpacing: 0.1 },
  eyebrow: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.6,
    textTransform: 'uppercase',
  },
  number: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.8,
    fontVariant: ['tabular-nums'],
  },
} as const;

const DARK: ThemeColors = {
  background: '#0A0A0F',
  backgroundAlt: '#101018',
  surface: '#15151F',
  surfaceAlt: '#1D1D2A',
  border: '#2A2A38',
  borderSoft: 'rgba(255,255,255,0.07)',
  text: '#F4F1EA',
  textMuted: '#A6A3B2',
  textDim: '#8A8797',
  accent: '#FF5A36',
  accentSoft: 'rgba(255,90,54,0.14)',
  gold: '#E9B44C',
  teal: '#54C6B4',
  blue: '#6C8CFF',
  rose: '#FF6B8B',
  star: '#F4C25A',
  onAccent: '#FFFFFF',
  overlay: 'rgba(0,0,0,0.6)',
};

const LIGHT: ThemeColors = {
  background: '#F6F1EA',
  backgroundAlt: '#EFE8DE',
  surface: '#FFFFFF',
  surfaceAlt: '#F1EAE0',
  border: '#E4DACD',
  borderSoft: 'rgba(0,0,0,0.06)',
  text: '#1A1820',
  textMuted: '#6E6875',
  textDim: '#7C7683',
  accent: '#C9341C',
  accentSoft: 'rgba(201,52,28,0.10)',
  gold: '#B8862B',
  teal: '#2E8B7E',
  blue: '#4A63C8',
  rose: '#C4456A',
  star: '#D9A02B',
  onAccent: '#FFFFFF',
  overlay: 'rgba(0,0,0,0.4)',
};


interface ThemeContextValue {
  mode: ThemeMode;
  colors: ThemeColors;
  toggle: () => void;
}

const DEFAULT_CONTEXT: ThemeContextValue = {
  mode: 'dark',
  colors: DARK,
  toggle: () => {},
};

const ThemeContext = createContext<ThemeContextValue>(DEFAULT_CONTEXT);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>('dark');

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
