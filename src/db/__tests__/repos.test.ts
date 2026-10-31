import { createTestDb, type TestDb } from '../../../test/sqljs-db';
import { initDb } from '../init';
import {
  AccountCurrencyLockedError,
  accountHasActivity,
  createAccount,
  getAccount,
  getBalancesByCurrency,
  listAccounts,
  listAccountsWithBalance,
  setAccountArchived,
  updateAccount,
} from '../repos/accounts';
import {
  createCategory,
  countCategoryTransactions,
  listArchivedCategories,
  deleteCategory,
  reassignAndDeleteCategory,
  setCategoryArchived,
  getCategory,
  listCategories,
  renameCategory,
} from '../repos/categories';
import { getCategoryMonthTotals, getMonthSummary } from '../repos/reports';
import {
  getBaseCurrency,
  getHideBalances,
  getHideBalancesInWidget,
  getLastAccountId,
  getSetting,
  setHideBalances,
  setHideBalancesInWidget,
  setLastAccountId,
  setSetting,
} from '../repos/settings';
import {
  createTransaction,
  deleteTransaction,
  getTransaction,
  listCategoriesByUse,
  listTransactions,
  updateTransaction,
} from '../repos/transactions';

let db: TestDb;
let eur: number;
let idr: number;
let food: number;
let salary: number;

beforeEach(async () => {
  db = await createTestDb();
  await initDb(db, { seed: false, locale: 'id', defaultCategories: false });
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

    const asOf = Object.fromEntries((await listAccountsWithBalance(db, { asOf: '2026-10-01' })).map((a) => [a.name, a.balanceMinor]));
    expect(asOf).toEqual({ 'Rekening EUR': 185000, 'Rekening IDR': 0, Dompet: 100_000 });
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

describe('account management', () => {
  it('renames and changes the opening balance and currency of an unused account', async () => {
    const id = await createAccount(db, { name: 'Dompet', currency: 'IDR' });
    expect(await accountHasActivity(db, id)).toBe(false);
    await updateAccount(db, id, { name: ' Tabungan ', currency: 'EUR', openingBalanceMinor: 5000 });
    expect(await getAccount(db, id)).toMatchObject({ name: 'Tabungan', currency: 'EUR', openingBalanceMinor: 5000 });
  });

  it('locks the currency once a transaction or transfer uses the account', async () => {
    await createTransaction(db, { accountId: eur, categoryId: food, type: 'expense', amountMinor: 100, date: '2026-10-01' });
    expect(await accountHasActivity(db, eur)).toBe(true);
    await expect(updateAccount(db, eur, { name: 'Rekening EUR', currency: 'IDR' })).rejects.toThrow(AccountCurrencyLockedError);
    await updateAccount(db, eur, { name: 'Bank EUR', currency: 'EUR', openingBalanceMinor: 1000 });
    expect((await getAccount(db, eur))?.name).toBe('Bank EUR');

    const wallet = await createAccount(db, { name: 'Dompet', currency: 'IDR' });
    await db.runAsync(
      "INSERT INTO transfers (from_account_id, to_account_id, from_amount_minor, to_amount_minor, date) VALUES (?, ?, 1, 1, '2026-10-01')",
      idr,
      wallet,
    );
    expect(await accountHasActivity(db, wallet)).toBe(true);
  });

  it('hides archived accounts from pickers and balances but can list them', async () => {
    await setAccountArchived(db, idr, true);
    expect((await listAccounts(db)).map((a) => a.currency)).toEqual(['EUR']);
    expect((await listAccountsWithBalance(db)).map((a) => a.currency)).toEqual(['EUR']);
    expect((await listAccountsWithBalance(db, { includeArchived: true })).map((a) => [a.currency, a.archived])).toEqual([
      ['EUR', false],
      ['IDR', true],
    ]);
    await setAccountArchived(db, idr, false);
    expect((await listAccounts(db)).length).toBe(2);
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

  it('deletes an unused category but refuses one that is in use', async () => {
    await createTransaction(db, { accountId: eur, categoryId: food, type: 'expense', amountMinor: 100, date: '2026-10-01' });
    expect(await countCategoryTransactions(db, food)).toBe(1);
    expect(await countCategoryTransactions(db, salary)).toBe(0);

    await expect(deleteCategory(db, food)).rejects.toThrow(/FOREIGN KEY/);
    await deleteCategory(db, salary);
    expect((await listCategories(db)).map((c) => c.name)).toEqual(['Makanan']);
  });

  it('moves transactions to another category before deleting', async () => {
    const groceries = await createCategory(db, 'Belanja');
    await createTransaction(db, { accountId: eur, categoryId: food, type: 'expense', amountMinor: 100, date: '2026-10-01' });
    await createTransaction(db, { accountId: idr, categoryId: food, type: 'expense', amountMinor: 5000, date: '2026-10-02' });

    await reassignAndDeleteCategory(db, food, groceries);

    expect(await getCategory(db, food)).toBeNull();
    expect((await listTransactions(db)).map((t) => t.categoryName)).toEqual(['Belanja', 'Belanja']);
    await expect(reassignAndDeleteCategory(db, groceries, groceries)).rejects.toThrow();
  });

  it('archives a category: gone from lists, still on its transactions', async () => {
    await createTransaction(db, { accountId: eur, categoryId: food, type: 'expense', amountMinor: 100, date: '2026-10-01' });
    await setCategoryArchived(db, food, true);
    expect((await listCategories(db)).map((c) => c.name)).toEqual(['Gaji']);
    expect((await listTransactions(db))[0].categoryName).toBe('Makanan');
    expect((await listArchivedCategories(db)).map((c) => c.name)).toEqual(['Makanan']);
    await setCategoryArchived(db, food, false);
    expect((await listCategories(db)).length).toBe(2);
    expect(await listArchivedCategories(db)).toEqual([]);
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

  it('updates and deletes a transaction', async () => {
    const id = await createTransaction(db, { accountId: eur, categoryId: food, type: 'expense', amountMinor: 1250, date: '2026-10-05' });
    await updateTransaction(db, id, { accountId: idr, categoryId: salary, type: 'income', amountMinor: 50_000, date: '2026-09-30', note: ' Bonus ' });
    expect(await getTransaction(db, id)).toMatchObject({
      accountName: 'Rekening IDR',
      categoryName: 'Gaji',
      type: 'income',
      amountMinor: 50_000,
      month: '2026-09',
      note: 'Bonus',
    });
    const balances = Object.fromEntries((await listAccountsWithBalance(db)).map((a) => [a.currency, a.balanceMinor]));
    expect(balances).toEqual({ EUR: 0, IDR: 50_000 });

    await deleteTransaction(db, id);
    expect(await getTransaction(db, id)).toBeNull();
  });

  it('orders categories by use in the last 90 days', async () => {
    const rent = await createCategory(db, 'Sewa');
    for (const date of ['2026-10-01', '2026-10-02', '2026-10-03']) {
      await createTransaction(db, { accountId: eur, categoryId: rent, type: 'expense', amountMinor: 1, date });
    }
    await createTransaction(db, { accountId: eur, categoryId: salary, type: 'income', amountMinor: 1, date: '2026-10-04' });
    // Older than 90 days or in the future: ignored.
    for (const date of ['2026-08-01', '2026-08-02', '2026-11-01', '2026-11-02']) {
      await createTransaction(db, { accountId: eur, categoryId: food, type: 'expense', amountMinor: 1, date });
    }
    expect((await listCategoriesByUse(db, { today: '2026-10-31' })).map((c) => c.name)).toEqual(['Sewa', 'Gaji', 'Makanan']);
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
      { currency: 'EUR', incomeMinor: 185000, expenseMinor: 2345, feeMinor: 0 },
      { currency: 'IDR', incomeMinor: 0, expenseMinor: 35_000, feeMinor: 0 },
    ]);
  });

  it('narrows to one category', async () => {
    expect(await getMonthSummary(db, '2026-10', { categoryId: salary })).toEqual([
      { currency: 'EUR', incomeMinor: 185000, expenseMinor: 0, feeMinor: 0 },
      { currency: 'IDR', incomeMinor: 0, expenseMinor: 0, feeMinor: 0 },
    ]);
  });

  it('returns zero rows for currencies without activity', async () => {
    expect(await getMonthSummary(db, '2026-11')).toEqual([
      { currency: 'EUR', incomeMinor: 0, expenseMinor: 0, feeMinor: 0 },
      { currency: 'IDR', incomeMinor: 0, expenseMinor: 0, feeMinor: 0 },
    ]);
  });
});

describe('transfers in balances and summaries', () => {
  const transfer = (fromAmount: number, toAmount: number, fee: number, date = '2026-10-30') =>
    db.runAsync(
      `INSERT INTO transfers (from_account_id, to_account_id, from_amount_minor, to_amount_minor, fee_minor, date)
       VALUES (?, ?, ?, ?, ?, ?)`,
      eur,
      idr,
      fromAmount,
      toAmount,
      fee,
      date,
    );

  beforeEach(async () => {
    await createTransaction(db, { accountId: eur, categoryId: salary, type: 'income', amountMinor: 185000, date: '2026-10-01' });
    await transfer(20000, 3_420_000, 150);
  });

  it('moves money between currencies and charges the fee to the source account', async () => {
    const balances = Object.fromEntries((await listAccountsWithBalance(db)).map((a) => [a.currency, a.balanceMinor]));
    expect(balances).toEqual({ EUR: 185000 - 20000 - 150, IDR: 3_420_000 });
    expect(await getBalancesByCurrency(db)).toEqual([
      { currency: 'EUR', balanceMinor: 164850 },
      { currency: 'IDR', balanceMinor: 3_420_000 },
    ]);
    expect(await getBalancesByCurrency(db, { asOf: '2026-10-29' })).toEqual([
      { currency: 'EUR', balanceMinor: 185000 },
      { currency: 'IDR', balanceMinor: 0 },
    ]);
  });

  it('counts the fee as expense but not the transferred amounts', async () => {
    expect(await getMonthSummary(db, '2026-10')).toEqual([
      { currency: 'EUR', incomeMinor: 185000, expenseMinor: 150, feeMinor: 150 },
      { currency: 'IDR', incomeMinor: 0, expenseMinor: 0, feeMinor: 0 },
    ]);
  });

  it('keeps fees out of category summaries and totals', async () => {
    expect(await getMonthSummary(db, '2026-10', { categoryId: salary })).toEqual([
      { currency: 'EUR', incomeMinor: 185000, expenseMinor: 0, feeMinor: 0 },
      { currency: 'IDR', incomeMinor: 0, expenseMinor: 0, feeMinor: 0 },
    ]);
    expect(await getCategoryMonthTotals(db, '2026-10')).toEqual([{ categoryId: salary, currency: 'EUR', netMinor: 185000 }]);
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

it('remembers the last account', async () => {
  expect(await getLastAccountId(db)).toBeNull();
  await setLastAccountId(db, idr);
  expect(await getLastAccountId(db)).toBe(idr);
});

it('defaults the base currency to EUR', async () => {
  expect(await getBaseCurrency(db)).toBe('EUR');
  await setSetting(db, 'base_currency', 'IDR');
  expect(await getBaseCurrency(db)).toBe('IDR');
  await setSetting(db, 'base_currency', 'USD');
  expect(await getBaseCurrency(db)).toBe('EUR');
});

it('stores the hide-balance switches, off by default', async () => {
  expect(await getHideBalances(db)).toBe(false);
  expect(await getHideBalancesInWidget(db)).toBe(false);
  await setHideBalances(db, true);
  await setHideBalancesInWidget(db, true);
  expect(await getHideBalances(db)).toBe(true);
  expect(await getHideBalancesInWidget(db)).toBe(true);
  await setHideBalances(db, false);
  expect(await getHideBalances(db)).toBe(false);
});
