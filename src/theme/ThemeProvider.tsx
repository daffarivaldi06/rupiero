import React, { createContext, useContext, useMemo } from 'react';
import { StyleSheet, useColorScheme } from 'react-native';
import { DarkTheme, DefaultTheme, type Theme as NavigationTheme } from '@react-navigation/native';
import { palettes, radius, space, type ColorScheme, type Palette } from './tokens';
import { fontFamily } from './typography';

export interface Theme {
  scheme: ColorScheme;
  color: Palette;
  radius: typeof radius;
  space: typeof space;
}

const themes: Record<ColorScheme, Theme> = {
  light: { scheme: 'light', color: palettes.light, radius, space },
  dark: { scheme: 'dark', color: palettes.dark, radius, space },
};

const ThemeContext = createContext<Theme>(themes.light);

/** Follows the system light/dark setting and updates live when it changes. */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const scheme: ColorScheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  return <ThemeContext.Provider value={themes[scheme]}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  return useContext(ThemeContext);
}

/**
 * StyleSheet built from the current theme, rebuilt only when the theme changes.
 * Pass a module-level factory so its identity is stable.
 */
export function useThemedStyles<T extends StyleSheet.NamedStyles<T>>(factory: (theme: Theme) => T): T {
  const theme = useTheme();
  return useMemo(() => StyleSheet.create(factory(theme)), [theme, factory]);
}

export function navigationTheme(theme: Theme): NavigationTheme {
  const base = theme.scheme === 'dark' ? DarkTheme : DefaultTheme;
  return {
    ...base,
    colors: {
      ...base.colors,
      primary: theme.color.ink,
      background: theme.color.bg,
      card: theme.color.bg,
      text: theme.color.ink,
      border: theme.color.line,
      notification: theme.color.expense,
    },
    fonts: {
      regular: { fontFamily: fontFamily.regular, fontWeight: '400' },
      medium: { fontFamily: fontFamily.medium, fontWeight: '500' },
      bold: { fontFamily: fontFamily.semibold, fontWeight: '600' },
      heavy: { fontFamily: fontFamily.bold, fontWeight: '700' },
    },
  };
}
