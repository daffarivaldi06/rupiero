import { Appearance } from 'react-native';

/** Settings → Theme. 'system' follows the phone's light/dark setting. */
export type ThemePreference = 'system' | 'light' | 'dark';

export const THEME_PREFERENCES: ThemePreference[] = ['system', 'light', 'dark'];

export function isThemePreference(value: unknown): value is ThemePreference {
  return value === 'system' || value === 'light' || value === 'dark';
}

/**
 * Applies the choice app-wide through Appearance, so native parts follow too (status bar, date
 * picker, window background), and useColorScheme — hence ThemeProvider — re-renders without a restart.
 */
export function applyThemePreference(preference: ThemePreference): void {
  Appearance.setColorScheme(preference === 'system' ? null : preference);
}
