import { createTestDb, type TestDb } from '../../../test/sqljs-db';
import { initDb } from '../init';
import { createAccount, getAccount, getBalancesByCurrency, listAccounts, listAccountsWithBalance } from '../repos/accounts';
import {
  createCategory,
  deleteCategoryWithTransactions,
  getCategory,
  listCategories,
  renameCategory,
} from '../repos/categories';
import { getCategoryMonthTotals, getMonthSummary } from '../repos/reports';
import { getSetting, setSetting } from '../repos/settings';
import { createTransaction, listTransactions } from '../repos/transactions';

let db: TestDb;
let eur: number;
let idr: number;
let food: number;
let salary: number;

beforeEach(async () => {
  db = await createTestDb();
  await initDb(db, { seed: false });
  [eur, idr] = (await listAccounts(db)).map((a) => a.id);
  food = await createCategory(db, 'Makanan');
  salary = await createCategory(db, 'Gaji');
});
afterEach(() => db.close());

describe('accounts', () => {
  it('lists the default accounts in order', async () => {
    expect((await listAccounts(db)).map((a) => [a.name, a.currency])).toEqual([
      ['Rekening EUR', 'EUR'],
      ['Rekening IDR', 'IDR'],
    ]);
  });

  it('appends new accounts with their opening balance', async () => {
    const id = await createAccount(db, { name: ' Dompet ', currency: 'IDR', openingBalanceMinor: 50_000 });
    expect(await getAccount(db, id)).toMatchObject({ name: 'Dompet', currency: 'IDR', openingBalanceMinor: 50_000, sortOrder: 2 });
  });

  it('computes balances per account in its own currency', async () => {
    const wallet = await createAccount(db, { name: 'Dompet', currency: 'IDR', openingBalanceMinor: 100_000 });
    await createTransaction(db, { accountId: eur, categoryId: salary, type: 'income', amountMinor: 185000, date: '2026-10-01' });
    await createTransaction(db, { accountId: eur, categoryId: food, type: 'expense', amountMinor: 2345, date: '2026-10-02' });
    await createTransaction(db, { accountId: wallet, categoryId: food, type: 'expense', amountMinor: 35_000, date: '2026-10-02' });

    const balances = Object.fromEntries((await listAccountsWithBalance(db)).map((a) => [a.name, a.balanceMinor]));
    expect(balances).toEqual({ 'Rekening EUR': 182655, 'Rekening IDR': 0, Dompet: 65_000 });
  });

  it('sums balances per currency, optionally up to a date', async () => {
    const wallet = await createAccount(db, { name: 'Dompet', currency: 'IDR', openingBalanceMinor: 100_000 });
    await createAccount(db, { name: 'Tabungan', currency: 'IDR', openingBalanceMinor: 250_000 });
    await createTransaction(db, { accountId: eur, categoryId: salary, type: 'income', amountMinor: 185000, date: '2026-09-30' });
    await createTransaction(db, { accountId: eur, categoryId: food, type: 'expense', amountMinor: 2345, date: '2026-10-01' });
    await createTransaction(db, { accountId: wallet, categoryId: food, type: 'expense', amountMinor: 35_000, date: '2026-10-02' });

    expect(await getBalancesByCurrency(db)).toEqual([
      { currency: 'EUR', balanceMinor: 182655 },
      { currency: 'IDR', balanceMinor: 315_000 },
    ]);
    expect(await getBalancesByCurrency(db, { asOf: '2026-09-30' })).toEqual([
      { currency: 'EUR', balanceMinor: 185000 },
      { currency: 'IDR', balanceMinor: 350_000 },
    ]);
  });
});

describe('categories', () => {
  it('renames without touching transactions', async () => {
    const txId = await createTransaction(db, { accountId: eur, categoryId: food, type: 'expense', amountMinor: 100, date: '2026-10-01' });
    await renameCategory(db, food, 'Makanan & Belanja');

    expect((await getCategory(db, food))?.name).toBe('Makanan & Belanja');
    const [tx] = await listTransactions(db);
    expect(tx).toMatchObject({ id: txId, categoryName: 'Makanan & Belanja' });
  });

  it('rejects duplicate names regardless of case', async () => {
    await expect(createCategory(db, 'makanan')).rejects.toThrow(/UNIQUE/);
    await expect(renameCategory(db, salary, 'MAKANAN')).rejects.toThrow(/UNIQUE/);
  });

  it('deletes a category together with its transactions only', async () => {
    await createTransaction(db, { accountId: eur, categoryId: food, type: 'expense', amountMinor: 100, date: '2026-10-01' });
    await createTransaction(db, { accountId: eur, categoryId: salary, type: 'income', amountMinor: 500, date: '2026-10-01' });

    await deleteCategoryWithTransactions(db, food);

    expect((await listCategories(db)).map((c) => c.name)).toEqual(['Gaji']);
    expect((await listTransactions(db)).map((t) => t.categoryId)).toEqual([salary]);
  });
});

describe('transactions', () => {
  it('lists newest first with account and category details', async () => {
    await createTransaction(db, { accountId: eur, categoryId: food, type: 'expense', amountMinor: 1250, date: '2026-10-05', note: ' Roti ' });
    await createTransaction(db, { accountId: idr, categoryId: food, type: 'expense', amountMinor: 35_000, date: '2026-10-07' });

    const list = await listTransactions(db);
    expect(list.map((t) => t.date)).toEqual(['2026-10-07', '2026-10-05']);
    expect(list[1]).toMatchObject({
      accountName: 'Rekening EUR',
      currency: 'EUR',
      categoryName: 'Makanan',
      amountMinor: 1250,
      month: '2026-10',
      note: 'Roti',
    });
  });

  it('filters by month, category and account', async () => {
    await createTransaction(db, { accountId: eur, categoryId: food, type: 'expense', amountMinor: 1, date: '2026-09-30' });
    await createTransaction(db, { accountId: eur, categoryId: food, type: 'expense', amountMinor: 2, date: '2026-10-01' });
    await createTransaction(db, { accountId: idr, categoryId: salary, type: 'income', amountMinor: 3, date: '2026-10-15' });

    const amounts = async (filter: Parameters<typeof listTransactions>[1]) =>
      (await listTransactions(db, filter)).map((t) => t.amountMinor);
    expect(await amounts({ month: '2026-10' })).toEqual([3, 2]);
    expect(await amounts({ month: '2026-10', categoryId: food })).toEqual([2]);
    expect(await amounts({ accountId: eur })).toEqual([2, 1]);
  });
});

describe('getMonthSummary', () => {
  beforeEach(async () => {
    await createTransaction(db, { accountId: eur, categoryId: salary, type: 'income', amountMinor: 185000, date: '2026-10-01' });
    await createTransaction(db, { accountId: eur, categoryId: food, type: 'expense', amountMinor: 2345, date: '2026-10-13' });
    await createTransaction(db, { accountId: idr, categoryId: food, type: 'expense', amountMinor: 35_000, date: '2026-10-07' });
    await createTransaction(db, { accountId: idr, categoryId: food, type: 'expense', amountMinor: 99_999, date: '2026-09-30' });
  });

  it('keeps currencies apart', async () => {
    expect(await getMonthSummary(db, '2026-10')).toEqual([
      { currency: 'EUR', incomeMinor: 185000, expenseMinor: 2345 },
      { currency: 'IDR', incomeMinor: 0, expenseMinor: 35_000 },
    ]);
  });

  it('narrows to one category', async () => {
    expect(await getMonthSummary(db, '2026-10', { categoryId: salary })).toEqual([
      { currency: 'EUR', incomeMinor: 185000, expenseMinor: 0 },
      { currency: 'IDR', incomeMinor: 0, expenseMinor: 0 },
    ]);
  });

  it('returns zero rows for currencies without activity', async () => {
    expect(await getMonthSummary(db, '2026-11')).toEqual([
      { currency: 'EUR', incomeMinor: 0, expenseMinor: 0 },
      { currency: 'IDR', incomeMinor: 0, expenseMinor: 0 },
    ]);
  });
});

describe('getCategoryMonthTotals', () => {
  it('nets each category per currency for the month only', async () => {
    await createTransaction(db, { accountId: eur, categoryId: salary, type: 'income', amountMinor: 185000, date: '2026-10-01' });
    await createTransaction(db, { accountId: eur, categoryId: food, type: 'expense', amountMinor: 2345, date: '2026-10-02' });
    await createTransaction(db, { accountId: eur, categoryId: food, type: 'income', amountMinor: 345, date: '2026-10-03' });
    await createTransaction(db, { accountId: idr, categoryId: food, type: 'expense', amountMinor: 35_000, date: '2026-10-04' });
    await createTransaction(db, { accountId: idr, categoryId: food, type: 'expense', amountMinor: 99_000, date: '2026-09-30' });

    expect(await getCategoryMonthTotals(db, '2026-10')).toEqual([
      { categoryId: food, currency: 'EUR', netMinor: -2000 },
      { categoryId: salary, currency: 'EUR', netMinor: 185000 },
      { categoryId: food, currency: 'IDR', netMinor: -35_000 },
    ]);
    expect(await getCategoryMonthTotals(db, '2026-11')).toEqual([]);
  });
});

it('stores settings as key-value pairs', async () => {
  expect(await getSetting(db, 'k')).toBeNull();
  await setSetting(db, 'k', '1');
  await setSetting(db, 'k', '2');
  expect(await getSetting(db, 'k')).toBe('2');
});
