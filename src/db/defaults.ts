// What a fresh install starts with: two accounts and eight categories, named in the language that is
// active at install. Created once (tracked in settings); after that the names are the user's own and
// are never translated or brought back.
import { t, type Locale } from '../i18n';
import type { CurrencyCode } from '../domain/money';
import type { Db } from './client';
import { getSetting, setSetting } from './repos/settings';

export const DEFAULTS_CREATED_KEY = 'defaults_created';

export const DEFAULT_ACCOUNTS: { key: 'eur' | 'idr'; currency: CurrencyCode }[] = [
  { key: 'eur', currency: 'EUR' },
  { key: 'idr', currency: 'IDR' },
];

export const DEFAULT_CATEGORIES = ['salary', 'rent', 'groceries', 'transport', 'bills', 'entertainment', 'health', 'other'] as const;
export type DefaultCategory = (typeof DEFAULT_CATEGORIES)[number];

export const defaultAccountName = (key: 'eur' | 'idr' | 'cash', locale: Locale) => t(`defaults.accounts.${key}`, undefined, locale);
export const defaultCategoryName = (key: DefaultCategory, locale: Locale) => t(`defaults.categories.${key}`, undefined, locale);

export interface DefaultsOptions {
  /** Off only in tests that build their own categories. */
  categories?: boolean;
}

/** Adds the default accounts and categories to empty tables, once per database. */
export async function ensureDefaults(db: Db, locale: Locale, options: DefaultsOptions = {}): Promise<void> {
  if ((await getSetting(db, DEFAULTS_CREATED_KEY)) === '1') return;
  await db.withTransactionAsync(async () => {
    const accounts = await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM accounts');
    if (!accounts?.n) {
      for (const [index, account] of DEFAULT_ACCOUNTS.entries()) {
        await db.runAsync(
          'INSERT INTO accounts (name, currency, sort_order) VALUES (?, ?, ?)',
          defaultAccountName(account.key, locale),
          account.currency,
          index,
        );
      }
    }
    const categories = await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM categories');
    if (options.categories !== false && !categories?.n) {
      for (const [index, key] of DEFAULT_CATEGORIES.entries()) {
        await db.runAsync('INSERT INTO categories (name, sort_order) VALUES (?, ?)', defaultCategoryName(key, locale), index);
      }
    }
    await setSetting(db, DEFAULTS_CREATED_KEY, '1');
  });
}
