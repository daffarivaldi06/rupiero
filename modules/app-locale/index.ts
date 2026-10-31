import { requireOptionalNativeModule } from 'expo';

interface AppLocaleModule {
  setAppLocale(tag: string | null): void;
}

// Android only; absent on other platforms and in tests, where native UI keeps the phone's language.
const AppLocale = requireOptionalNativeModule<AppLocaleModule>('AppLocale');

/** Sets the language of native UI (date picker); null follows the phone. */
export function setAppLocale(tag: string | null): void {
  AppLocale?.setAppLocale(tag);
}
