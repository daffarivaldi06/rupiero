import { addMonths, dateInMonth, monthOf, todayLocal, type LocalDate } from '../domain/dates';
import type { CurrencyCode } from '../domain/money';
import type { TransactionType } from '../domain/types';
import type { Db } from './client';
import { DEFAULT_ACCOUNTS } from './migrations/001_initial';
import { getSetting, setSetting } from './repos/settings';

export const SAMPLE_DATA_SEEDED_KEY = 'sample_data_seeded';

const CASH_ACCOUNT = { name: 'Dompet Tunai', currency: 'IDR' as const, openingBalanceMinor: 750_000 };

export const SAMPLE_CATEGORIES = [
  'Gaji',
  'Sewa',
  'Makanan & Belanja',
  'Transportasi',
  'Tagihan',
  'Hiburan',
  'Kesehatan',
  'Lainnya',
] as const;

type SampleCategory = (typeof SAMPLE_CATEGORIES)[number];
type SampleAccount = (typeof DEFAULT_ACCOUNTS)[number]['name'] | typeof CASH_ACCOUNT.name;

interface Template {
  day: number;
  account: SampleAccount;
  category: SampleCategory;
  type: TransactionType;
  /** Minor units per month, oldest month first; one value means every month. */
  amounts: number[];
  note: string;
}

// Three months of a plausible life split between a EUR and an IDR account.
const TEMPLATES: Template[] = [
  { day: 1, account: 'Rekening EUR', category: 'Gaji', type: 'income', amounts: [185000], note: 'Gaji bulanan' },
  { day: 2, account: 'Rekening EUR', category: 'Transportasi', type: 'expense', amounts: [8640], note: 'Abonemen transportasi' },
  { day: 3, account: 'Rekening EUR', category: 'Sewa', type: 'expense', amounts: [65000], note: 'Sewa apartemen' },
  { day: 5, account: 'Rekening EUR', category: 'Tagihan', type: 'expense', amounts: [3999], note: 'Internet & HP' },
  { day: 6, account: 'Rekening EUR', category: 'Makanan & Belanja', type: 'expense', amounts: [6180, 5875, 7240], note: 'Belanja mingguan' },
  { day: 13, account: 'Rekening EUR', category: 'Makanan & Belanja', type: 'expense', amounts: [2345, 4110, 3385], note: 'Belanja' },
  { day: 15, account: 'Rekening EUR', category: 'Hiburan', type: 'expense', amounts: [1250, 2400, 1250], note: 'Bioskop' },
  { day: 20, account: 'Rekening EUR', category: 'Makanan & Belanja', type: 'expense', amounts: [4790, 5320, 4455], note: 'Belanja mingguan' },
  { day: 22, account: 'Rekening EUR', category: 'Kesehatan', type: 'expense', amounts: [0, 1895, 0], note: 'Apotek' },
  { day: 27, account: 'Rekening EUR', category: 'Makanan & Belanja', type: 'expense', amounts: [3260, 0, 2790], note: 'Makan malam di luar' },
  { day: 1, account: 'Rekening IDR', category: 'Gaji', type: 'income', amounts: [3_500_000, 2_750_000, 4_200_000], note: 'Honor freelance' },
  { day: 4, account: 'Rekening IDR', category: 'Tagihan', type: 'expense', amounts: [450_000], note: 'Token listrik rumah' },
  { day: 10, account: 'Rekening IDR', category: 'Tagihan', type: 'expense', amounts: [100_000], note: 'Pulsa' },
  { day: 18, account: 'Rekening IDR', category: 'Lainnya', type: 'expense', amounts: [1_000_000], note: 'Kiriman untuk orang tua' },
  { day: 25, account: 'Rekening IDR', category: 'Hiburan', type: 'expense', amounts: [54_990], note: 'Langganan streaming' },
  { day: 7, account: 'Dompet Tunai', category: 'Makanan & Belanja', type: 'expense', amounts: [35_000, 42_500, 38_000], note: 'Makan siang' },
  { day: 12, account: 'Dompet Tunai', category: 'Transportasi', type: 'expense', amounts: [18_500, 23_000, 18_500], note: 'Ojek' },
  { day: 21, account: 'Dompet Tunai', category: 'Makanan & Belanja', type: 'expense', amounts: [27_500], note: 'Kopi & camilan' },
];

const MONTHS_BACK = 2;

async function findOrCreateAccount(db: Db, name: string, currency: CurrencyCode, openingBalanceMinor = 0) {
  const byName = await db.getFirstAsync<{ id: number }>('SELECT id FROM accounts WHERE name = ?', name);
  if (byName) return byName.id;
  // A default account may have been renamed; fall back to any account in the same currency.
  if (name !== CASH_ACCOUNT.name) {
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

/**
 * Adds sample data once (tracked in settings, so clearing transactions does not bring it back).
 * Never creates transactions dated after `today`. Returns whether anything was added.
 */
export async function seedSampleData(db: Db, today: LocalDate = todayLocal()): Promise<boolean> {
  if ((await getSetting(db, SAMPLE_DATA_SEEDED_KEY)) === '1') return false;

  await db.withTransactionAsync(async () => {
    const accountIds = new Map<string, number>();
    for (const account of DEFAULT_ACCOUNTS) {
      accountIds.set(account.name, await findOrCreateAccount(db, account.name, account.currency));
    }
    accountIds.set(
      CASH_ACCOUNT.name,
      await findOrCreateAccount(db, CASH_ACCOUNT.name, CASH_ACCOUNT.currency, CASH_ACCOUNT.openingBalanceMinor),
    );

    const categoryIds = new Map<string, number>();
    for (const [index, name] of SAMPLE_CATEGORIES.entries()) {
      await db.runAsync('INSERT OR IGNORE INTO categories (name, sort_order) VALUES (?, ?)', name, index);
      const row = await db.getFirstAsync<{ id: number }>('SELECT id FROM categories WHERE name = ?', name);
      categoryIds.set(name, row!.id);
    }

    const thisMonth = monthOf(today);
    for (let back = MONTHS_BACK; back >= 0; back--) {
      const month = addMonths(thisMonth, -back);
      const monthIndex = MONTHS_BACK - back;
      for (const t of TEMPLATES) {
        const amount = t.amounts.length === 1 ? t.amounts[0] : t.amounts[monthIndex];
        const date = dateInMonth(month, t.day);
        if (amount <= 0 || date > today) continue;
        await db.runAsync(
          `INSERT INTO transactions (account_id, category_id, type, amount_minor, date, note)
           VALUES (?, ?, ?, ?, ?, ?)`,
          accountIds.get(t.account)!,
          categoryIds.get(t.category)!,
          t.type,
          amount,
          date,
          t.note,
        );
      }
    }

    await setSetting(db, SAMPLE_DATA_SEEDED_KEY, '1');
  });
  return true;
}
