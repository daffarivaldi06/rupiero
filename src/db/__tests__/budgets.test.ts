import { createTestDb, type TestDb } from '../../../test/sqljs-db';
import { initDb } from '../init';
import { listAccounts } from '../repos/accounts';
import { copyBudgetsFromPreviousMonth, deleteBudget, listBudgets, listCategoryBudgets, setBudget } from '../repos/budgets';
import { createCategory, setCategoryArchived } from '../repos/categories';
import { createTransaction } from '../repos/transactions';
import { createTransfer } from '../repos/transfers';

let db: TestDb;
let eur: number;
let idr: number;
let food: number;
let fun: number;

beforeEach(async () => {
  db = await createTestDb();
  await initDb(db, { seed: false });
  [eur, idr] = (await listAccounts(db)).map((a) => a.id);
  food = await createCategory(db, 'Makanan');
  fun = await createCategory(db, 'Hiburan');
});
afterEach(() => db.close());

describe('budgets', () => {
  it('measures spending per currency against each limit', async () => {
    await setBudget(db, { categoryId: food, month: '2026-10', currency: 'EUR', limitMinor: 30000 });
    await setBudget(db, { categoryId: food, month: '2026-10', currency: 'IDR', limitMinor: 500_000 });
    await createTransaction(db, { accountId: eur, categoryId: food, type: 'expense', amountMinor: 25000, date: '2026-10-05' });
    await createTransaction(db, { accountId: eur, categoryId: food, type: 'income', amountMinor: 1000, date: '2026-10-06' }); // refund: not spending
    await createTransaction(db, { accountId: eur, categoryId: food, type: 'expense', amountMinor: 9999, date: '2026-09-30' }); // other month
    await createTransaction(db, { accountId: idr, categoryId: food, type: 'expense', amountMinor: 120_000, date: '2026-10-07' });
    await createTransfer(db, { fromAccountId: eur, toAccountId: idr, fromAmountMinor: 100, toAmountMinor: 20000, feeMinor: 150, date: '2026-10-08' });

    expect(await listBudgets(db, '2026-10')).toEqual([
      { categoryId: food, categoryName: 'Makanan', month: '2026-10', currency: 'EUR', limitMinor: 30000, spentMinor: 25000 },
      { categoryId: food, categoryName: 'Makanan', month: '2026-10', currency: 'IDR', limitMinor: 500_000, spentMinor: 120_000 },
    ]);
    expect((await listCategoryBudgets(db, food, '2026-10')).map((b) => b.currency)).toEqual(['EUR', 'IDR']);
    expect(await listCategoryBudgets(db, fun, '2026-10')).toEqual([]);
  });

  it('replaces and deletes a limit', async () => {
    const key = { categoryId: food, month: '2026-10', currency: 'EUR' as const };
    await setBudget(db, { ...key, limitMinor: 30000 });
    await setBudget(db, { ...key, limitMinor: 35000 });
    expect((await listBudgets(db, '2026-10')).map((b) => b.limitMinor)).toEqual([35000]);
    await deleteBudget(db, key);
    expect(await listBudgets(db, '2026-10')).toEqual([]);
  });

  it('copies last month’s limits without overwriting ones already set', async () => {
    await setBudget(db, { categoryId: food, month: '2026-09', currency: 'EUR', limitMinor: 30000 });
    await setBudget(db, { categoryId: fun, month: '2026-09', currency: 'EUR', limitMinor: 5000 });
    await setBudget(db, { categoryId: fun, month: '2026-10', currency: 'EUR', limitMinor: 8000 });

    expect(await copyBudgetsFromPreviousMonth(db, '2026-10')).toBe(1);
    expect((await listBudgets(db, '2026-10')).map((b) => [b.categoryName, b.limitMinor])).toEqual([
      ['Makanan', 30000],
      ['Hiburan', 8000],
    ]);
    expect(await copyBudgetsFromPreviousMonth(db, '2026-10')).toBe(0);
  });

  it('skips archived categories when copying', async () => {
    await setBudget(db, { categoryId: fun, month: '2026-09', currency: 'EUR', limitMinor: 5000 });
    await setCategoryArchived(db, fun, true);
    expect(await copyBudgetsFromPreviousMonth(db, '2026-10')).toBe(0);
  });
});
