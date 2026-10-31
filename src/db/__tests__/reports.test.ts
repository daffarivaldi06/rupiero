import { createTestDb, type TestDb } from '../../../test/sqljs-db';
import { initDb } from '../init';
import { listAccounts } from '../repos/accounts';
import { createCategory } from '../repos/categories';
import { getCategoryBreakdown, getMonthlyTrend, getMonthSummary } from '../repos/reports';
import { createTransaction } from '../repos/transactions';
import { createTransfer } from '../repos/transfers';

let db: TestDb;
let eur: number;
let idr: number;
let food: number;
let rent: number;

beforeEach(async () => {
  db = await createTestDb();
  await initDb(db, { seed: false, locale: 'id', defaultCategories: false });
  [eur, idr] = (await listAccounts(db)).map((a) => a.id);
  food = await createCategory(db, 'Makanan');
  rent = await createCategory(db, 'Sewa');
  const salary = await createCategory(db, 'Gaji');
  const tx = (accountId: number, categoryId: number, type: 'income' | 'expense', amountMinor: number, date: string) =>
    createTransaction(db, { accountId, categoryId, type, amountMinor, date });
  await tx(eur, salary, 'income', 185000, '2026-10-01');
  await tx(eur, rent, 'expense', 65000, '2026-10-03');
  await tx(eur, food, 'expense', 17870, '2026-10-05');
  await tx(eur, food, 'expense', 2000, '2026-10-06');
  await tx(idr, food, 'expense', 65_500, '2026-10-07');
  await tx(eur, food, 'expense', 4455, '2026-08-20');
  await createTransfer(db, { fromAccountId: eur, toAccountId: idr, fromAmountMinor: 20000, toAmountMinor: 3_420_000, feeMinor: 150, date: '2026-10-30' });
});
afterEach(() => db.close());

describe('getCategoryBreakdown', () => {
  it('lists spending per category and currency, largest first, with fees separate', async () => {
    expect(await getCategoryBreakdown(db, '2026-10')).toEqual([
      { currency: 'EUR', categoryId: rent, name: 'Sewa', expenseMinor: 65000 },
      { currency: 'EUR', categoryId: food, name: 'Makanan', expenseMinor: 19870 },
      { currency: 'EUR', categoryId: null, name: 'Biaya transfer', expenseMinor: 150 },
      { currency: 'IDR', categoryId: food, name: 'Makanan', expenseMinor: 65_500 },
    ]);
  });

  it('adds up to the monthly summary in every currency', async () => {
    const breakdown = await getCategoryBreakdown(db, '2026-10');
    for (const summary of await getMonthSummary(db, '2026-10')) {
      const total = breakdown.filter((b) => b.currency === summary.currency).reduce((sum, b) => sum + b.expenseMinor, 0);
      expect(total).toBe(summary.expenseMinor);
    }
  });
});

describe('getMonthlyTrend', () => {
  it('gives six months per currency, oldest first, zero-filled', async () => {
    const trend = await getMonthlyTrend(db, '2026-10');
    expect(trend.filter((t) => t.currency === 'EUR')).toEqual([
      { month: '2026-05', currency: 'EUR', expenseMinor: 0 },
      { month: '2026-06', currency: 'EUR', expenseMinor: 0 },
      { month: '2026-07', currency: 'EUR', expenseMinor: 0 },
      { month: '2026-08', currency: 'EUR', expenseMinor: 4455 },
      { month: '2026-09', currency: 'EUR', expenseMinor: 0 },
      { month: '2026-10', currency: 'EUR', expenseMinor: 65000 + 19870 + 150 },
    ]);
    expect(trend.filter((t) => t.currency === 'IDR').map((t) => t.expenseMinor)).toEqual([0, 0, 0, 0, 0, 65_500]);
  });

  it('matches the monthly summary for each month', async () => {
    const trend = await getMonthlyTrend(db, '2026-10', 3);
    for (const point of trend) {
      const summary = (await getMonthSummary(db, point.month)).find((s) => s.currency === point.currency)!;
      expect(point.expenseMinor).toBe(summary.expenseMinor);
    }
  });
});
