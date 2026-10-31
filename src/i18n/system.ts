import { getLocales } from 'expo-localization';
import type { Db } from '../db/client';
import { getLanguagePreference } from '../db/repos/settings';
import { resolveLocale, setLocale, type Locale } from './locale';

/** The phone's preferred language codes, most preferred first ([] where unavailable, e.g. tests). */
export function systemLanguageCodes(): (string | null)[] {
  try {
    return getLocales().map((l) => l.languageCode);
  } catch {
    return [];
  }
}

/**
 * Applies the stored language choice (or the phone's language) to everything that translates.
 * Runs when the database opens and before each widget render, so the widget follows a language
 * change even while the app is closed.
 */
export async function loadLocale(db: Db): Promise<Locale> {
  const locale = resolveLocale(await getLanguagePreference(db), systemLanguageCodes());
  setLocale(locale);
  return locale;
}
