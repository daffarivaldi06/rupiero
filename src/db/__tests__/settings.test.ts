import { Appearance } from 'react-native';
import { createTestDb, type TestDb } from '../../../test/sqljs-db';
import { applyThemePreference } from '../../theme/themePreference';
import { onDataChanged } from '../events';
import { initDb } from '../init';
import {
  getLanguagePreference,
  getThemePreference,
  setLanguagePreference,
  setSetting,
  setThemePreference,
  THEME_KEY,
  LANGUAGE_KEY,
} from '../repos/settings';

let db: TestDb;
beforeEach(async () => {
  db = await createTestDb();
  await initDb(db, { seed: false, locale: 'id' });
});
afterEach(() => db.close());

describe('theme preference', () => {
  it('defaults to following the system', async () => {
    expect(await getThemePreference(db)).toBe('system');
  });

  it('stores light and dark and reads them back', async () => {
    await setThemePreference(db, 'dark');
    expect(await getThemePreference(db)).toBe('dark');
    await setThemePreference(db, 'light');
    expect(await getThemePreference(db)).toBe('light');
    await setThemePreference(db, 'system');
    expect(await getThemePreference(db)).toBe('system');
  });

  it('falls back to the system for an unknown stored value', async () => {
    await setSetting(db, THEME_KEY, 'sepia');
    expect(await getThemePreference(db)).toBe('system');
  });

  it('notifies data listeners so the widget redraws in the new theme', async () => {
    const listener = jest.fn();
    const unsubscribe = onDataChanged(listener);
    await setThemePreference(db, 'dark');
    unsubscribe();
    expect(listener).toHaveBeenCalled();
  });

  it('applies through Appearance; "system" clears the override', () => {
    const spy = jest.spyOn(Appearance, 'setColorScheme').mockImplementation(() => {});
    applyThemePreference('dark');
    applyThemePreference('light');
    applyThemePreference('system');
    expect(spy.mock.calls).toEqual([['dark'], ['light'], [null]]);
    spy.mockRestore();
  });
});

describe('language preference', () => {
  it('defaults to following the system and stores a choice', async () => {
    expect(await getLanguagePreference(db)).toBe('system');
    await setLanguagePreference(db, 'en');
    expect(await getLanguagePreference(db)).toBe('en');
    await setSetting(db, LANGUAGE_KEY, 'fr');
    expect(await getLanguagePreference(db)).toBe('system');
  });

  it('is used for the defaults of a new database', async () => {
    const fresh = await createTestDb();
    // Same order as the app: migrations create settings, the stored choice decides the language.
    await initDb(fresh, { seed: false, locale: 'id', defaultCategories: false });
    await setLanguagePreference(fresh, 'en');
    await fresh.execAsync("DELETE FROM accounts; DELETE FROM settings WHERE key = 'defaults_created'");
    await initDb(fresh, { seed: false });
    expect((await fresh.getAllAsync<{ name: string }>('SELECT name FROM accounts ORDER BY sort_order')).map((a) => a.name)).toEqual([
      'EUR account',
      'IDR account',
    ]);
    fresh.close();
  });
});
