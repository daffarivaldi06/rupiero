import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useLocales } from 'expo-localization';
import { setAppLocale } from '../../modules/app-locale';
import { useSQLiteContext } from '../db/DatabaseProvider';
import { notifyDataChanged } from '../db/events';
import { getLanguagePreference, setLanguagePreference } from '../db/repos/settings';
import { getLocale, onLocaleChange, resolveLocale, setLocale, type LanguagePreference, type Locale } from './locale';
import { t as translate, type MessageKey, type MessageParams } from './index';

interface I18nContextValue {
  locale: Locale;
  /** Translate in the current language; a new function after every language change. */
  t: (key: MessageKey, params?: MessageParams) => string;
  preference: LanguagePreference;
  setPreference: (preference: LanguagePreference) => void;
}

const bind = (locale: Locale) => (key: MessageKey, params?: MessageParams) => translate(key, params, locale);

const I18nContext = createContext<I18nContextValue>({
  locale: getLocale(),
  t: (key, params) => translate(key, params),
  preference: 'system',
  setPreference: () => {},
});

/** Components that show text call this, so they re-render when the language changes. */
export const useI18n = () => useContext(I18nContext);

/**
 * The language choice from settings, applied live: switching in Settings, or changing the phone's
 * language while "follow system" is on, re-renders every screen and redraws the widget, no restart.
 * The database open already applied the stored choice (loadLocale), so the first frame is right.
 */
export function I18nProvider({ children }: { children: React.ReactNode }) {
  const db = useSQLiteContext();
  const systemLocales = useLocales();
  const systemKey = systemLocales.map((l) => l.languageCode).join(',');
  const [preference, setPreferenceState] = useState<LanguagePreference | null>(null);
  const [locale, setLocaleState] = useState(getLocale());

  useEffect(() => onLocaleChange(setLocaleState), []);

  useEffect(() => {
    getLanguagePreference(db).then(setPreferenceState).catch(console.error);
  }, [db]);

  // Native UI (the date picker) follows an explicit choice too; 'system' hands it back to the phone.
  useEffect(() => {
    if (preference !== null) setAppLocale(preference === 'system' ? null : preference);
  }, [preference]);

  useEffect(() => {
    if (preference === null) return;
    const next = resolveLocale(preference, systemKey.split(','));
    if (next === getLocale()) return;
    setLocale(next);
    // Screens reload their data and the widget redraws in the new language.
    notifyDataChanged();
  }, [preference, systemKey]);

  const setPreference = useCallback(
    (next: LanguagePreference) => {
      setPreferenceState(next);
      setLanguagePreference(db, next).catch(console.error);
    },
    [db],
  );

  const value = useMemo(
    () => ({ locale, t: bind(locale), preference: preference ?? 'system', setPreference }),
    [locale, preference, setPreference],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
