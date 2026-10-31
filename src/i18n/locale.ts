// The active UI language. Module state rather than only React context, so the widget task, repos
// and formatters (which run outside components) translate with the same language as the screens.

export type Locale = 'id' | 'en';
/** What the user picked in Settings; 'system' follows the phone's language. */
export type LanguagePreference = 'system' | Locale;

export const LANGUAGE_PREFERENCES: LanguagePreference[] = ['system', 'id', 'en'];

export function isLanguagePreference(value: unknown): value is LanguagePreference {
  return value === 'system' || value === 'id' || value === 'en';
}

/**
 * The language to use: the explicit choice, or for 'system' Indonesian when the phone's primary
 * language is Indonesian ('id', or the legacy 'in' code older Android versions report), else English.
 */
export function resolveLocale(preference: LanguagePreference, systemLanguages: readonly (string | null | undefined)[]): Locale {
  if (preference !== 'system') return preference;
  const primary = systemLanguages.find((code) => !!code)?.toLowerCase().split(/[-_]/)[0];
  return primary === 'id' || primary === 'in' ? 'id' : 'en';
}

let current: Locale = 'id';
const listeners = new Set<(locale: Locale) => void>();

export function getLocale(): Locale {
  return current;
}

export function setLocale(locale: Locale): void {
  if (locale === current) return;
  current = locale;
  for (const listener of listeners) listener(locale);
}

export function onLocaleChange(listener: (locale: Locale) => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
