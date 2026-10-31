import { addMonths, dateInMonth, monthOf, todayLocal, type LocalDate } from '../domain/dates';
import type { CurrencyCode } from '../domain/money';
import type { TransactionType } from '../domain/types';
import { t, type Locale } from '../i18n';
import { getLocale } from '../i18n/locale';
import type { Db } from './client';
import { DEFAULT_ACCOUNTS, DEFAULT_CATEGORIES, defaultAccountName, defaultCategoryName, type DefaultCategory } from './defaults';
import { getSetting, setSetting } from './repos/settings';

export const SAMPLE_DATA_SEEDED_KEY = 'sample_data_seeded';

const CASH_ACCOUNT = { key: 'cash' as const, currency: 'IDR' as const, openingBalanceMinor: 750_000 };

type SampleAccount = 'eur' | 'idr' | 'cash';
type SampleNote =
  | 'salary' | 'transitPass' | 'rent' | 'internet' | 'weeklyGroceries' | 'groceries' | 'cinema' | 'pharmacy' | 'dinnerOut'
  | 'freelance' | 'electricity' | 'phoneCredit' | 'parents' | 'streaming' | 'lunch' | 'ojek' | 'coffee';

interface Template {
  day: number;
  account: SampleAccount;
  category: DefaultCategory;
  type: TransactionType;
  /** Minor units per month, oldest month first; one value means every month. */
  amounts: number[];
  note: SampleNote;
}

// Three months of a plausible life split between a EUR and an IDR account.
const TEMPLATES: Template[] = [
  { day: 1, account: 'eur', category: 'salary', type: 'income', amounts: [185000], note: 'salary' },
  { day: 2, account: 'eur', category: 'transport', type: 'expense', amounts: [8640], note: 'transitPass' },
  { day: 3, account: 'eur', category: 'rent', type: 'expense', amounts: [65000], note: 'rent' },
  { day: 5, account: 'eur', category: 'bills', type: 'expense', amounts: [3999], note: 'internet' },
  { day: 6, account: 'eur', category: 'groceries', type: 'expense', amounts: [6180, 5875, 7240], note: 'weeklyGroceries' },
  { day: 13, account: 'eur', category: 'groceries', type: 'expense', amounts: [2345, 4110, 3385], note: 'groceries' },
  { day: 15, account: 'eur', category: 'entertainment', type: 'expense', amounts: [1250, 2400, 1250], note: 'cinema' },
  { day: 20, account: 'eur', category: 'groceries', type: 'expense', amounts: [4790, 5320, 4455], note: 'weeklyGroceries' },
  { day: 22, account: 'eur', category: 'health', type: 'expense', amounts: [0, 1895, 0], note: 'pharmacy' },
  { day: 27, account: 'eur', category: 'groceries', type: 'expense', amounts: [3260, 0, 2790], note: 'dinnerOut' },
  { day: 1, account: 'idr', category: 'salary', type: 'income', amounts: [3_500_000, 2_750_000, 4_200_000], note: 'freelance' },
  { day: 4, account: 'idr', category: 'bills', type: 'expense', amounts: [450_000], note: 'electricity' },
  { day: 10, account: 'idr', category: 'bills', type: 'expense', amounts: [100_000], note: 'phoneCredit' },
  { day: 18, account: 'idr', category: 'other', type: 'expense', amounts: [1_000_000], note: 'parents' },
  { day: 25, account: 'idr', category: 'entertainment', type: 'expense', amounts: [54_990], note: 'streaming' },
  { day: 7, account: 'cash', category: 'groceries', type: 'expense', amounts: [35_000, 42_500, 38_000], note: 'lunch' },
  { day: 12, account: 'cash', category: 'transport', type: 'expense', amounts: [18_500, 23_000, 18_500], note: 'ojek' },
  { day: 21, account: 'cash', category: 'groceries', type: 'expense', amounts: [27_500], note: 'coffee' },
];

const MONTHS_BACK = 2;

async function findOrCreateAccount(db: Db, name: string, currency: CurrencyCode, isCash: boolean, openingBalanceMinor = 0) {
  const byName = await db.getFirstAsync<{ id: number }>('SELECT id FROM accounts WHERE name = ?', name);
  if (byName) return byName.id;
  // A default account may have been renamed; fall back to any account in the same currency.
  if (!isCash) {
    const byCurrency = await db.getFirstAsync<{ id: number }>(
      'SELECT id FROM accounts WHERE currency = ? ORDER BY sort_order LIMIT 1',
      currency,
    );
    if (byCurrency) return byCurrency.id;
  }
  const result = await db.runAsync(
    `INSERT INTO accounts (name, currency, opening_balance_minor, sort_order)
     VALUES (?, ?, ?, (SELECT COALESCE(MAX(sort_order) + 1, 0) FROM accounts))`,
    name,
    currency,
    openingBalanceMinor,
  );
  return result.lastInsertRowId;
}

export interface SeedOptions {
  today?: LocalDate;
  /** Language of account, category and note names. */
  locale?: Locale;
}

/**
 * Adds sample data once (tracked in settings, so clearing transactions does not bring it back).
 * Never creates transactions dated after `today`. Returns whether anything was added.
 */
export async function seedSampleData(db: Db, { today = todayLocal(), locale = getLocale() }: SeedOptions = {}): Promise<boolean> {
  if ((await getSetting(db, SAMPLE_DATA_SEEDED_KEY)) === '1') return false;

  await db.withTransactionAsync(async () => {
    const accountIds = new Map<SampleAccount, number>();
    for (const account of DEFAULT_ACCOUNTS) {
      accountIds.set(account.key, await findOrCreateAccount(db, defaultAccountName(account.key, locale), account.currency, false));
    }
    accountIds.set(
      CASH_ACCOUNT.key,
      await findOrCreateAccount(db, defaultAccountName('cash', locale), CASH_ACCOUNT.currency, true, CASH_ACCOUNT.openingBalanceMinor),
    );

    const categoryIds = new Map<DefaultCategory, number>();
    for (const [index, key] of DEFAULT_CATEGORIES.entries()) {
      const name = defaultCategoryName(key, locale);
      await db.runAsync('INSERT OR IGNORE INTO categories (name, sort_order) VALUES (?, ?)', name, index);
      const row = await db.getFirstAsync<{ id: number }>('SELECT id FROM categories WHERE name = ?', name);
      categoryIds.set(key, row!.id);
    }

    const thisMonth = monthOf(today);
    for (let back = MONTHS_BACK; back >= 0; back--) {
      const month = addMonths(thisMonth, -back);
      const monthIndex = MONTHS_BACK - back;
      for (const tpl of TEMPLATES) {
        const amount = tpl.amounts.length === 1 ? tpl.amounts[0] : tpl.amounts[monthIndex];
        const date = dateInMonth(month, tpl.day);
        if (amount <= 0 || date > today) continue;
        await db.runAsync(
          `INSERT INTO transactions (account_id, category_id, type, amount_minor, date, note)
           VALUES (?, ?, ?, ?, ?, ?)`,
          accountIds.get(tpl.account)!,
          categoryIds.get(tpl.category)!,
          tpl.type,
          amount,
          date,
          t(`sample.notes.${tpl.note}`, undefined, locale),
        );
      }
    }

    await setSetting(db, SAMPLE_DATA_SEEDED_KEY, '1');
  });
  return true;
}
