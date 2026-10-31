import { isCurrencyCode, type CurrencyCode } from '../../domain/money';
import type { Db } from '../client';
import { notifyDataChanged } from '../events';

export async function getSetting(db: Db, key: string): Promise<string | null> {
  const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM settings WHERE key = ?', key);
  return row?.value ?? null;
}

export async function setSetting(db: Db, key: string, value: string): Promise<void> {
  await db.runAsync(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    key,
    value,
  );
}

export const LAST_ACCOUNT_KEY = 'last_account_id';

/** The account of the last saved transaction: the quick-add default. */
export async function getLastAccountId(db: Db): Promise<number | null> {
  const value = await getSetting(db, LAST_ACCOUNT_KEY);
  return value === null ? null : Number(value);
}

export async function setLastAccountId(db: Db, accountId: number): Promise<void> {
  await setSetting(db, LAST_ACCOUNT_KEY, String(accountId));
}

export const BASE_CURRENCY_KEY = 'base_currency';

/** Currency of the combined "≈" total (EUR unless changed). */
export async function getBaseCurrency(db: Db): Promise<CurrencyCode> {
  const value = await getSetting(db, BASE_CURRENCY_KEY);
  return value !== null && isCurrencyCode(value) ? value : 'EUR';
}

export const HIDE_BALANCES_KEY = 'hide_balances';
export const HIDE_BALANCES_WIDGET_KEY = 'hide_balances_widget';

async function getFlag(db: Db, key: string): Promise<boolean> {
  return (await getSetting(db, key)) === '1';
}

async function setFlag(db: Db, key: string, value: boolean): Promise<void> {
  await setSetting(db, key, value ? '1' : '0');
  // Hiding balances changes what the widget shows.
  notifyDataChanged();
}

/** Show amounts as "€ ••••" everywhere in the app. */
export const getHideBalances = (db: Db) => getFlag(db, HIDE_BALANCES_KEY);
export const setHideBalances = (db: Db, value: boolean) => setFlag(db, HIDE_BALANCES_KEY, value);

/** Also hide them in the home-screen widget (only while hide_balances is on). */
export const getHideBalancesInWidget = (db: Db) => getFlag(db, HIDE_BALANCES_WIDGET_KEY);
export const setHideBalancesInWidget = (db: Db, value: boolean) => setFlag(db, HIDE_BALANCES_WIDGET_KEY, value);
