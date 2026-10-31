import { createTestDb, type TestDb } from '../../../test/sqljs-db';
import { initDb } from '../init';
import { listAccountsWithBalance } from '../repos/accounts';
import { DEFAULT_CATEGORIES } from '../defaults';
import { seedSampleData } from '../seed';

let db: TestDb;
beforeEach(async () => {
  db = await createTestDb();
  await initDb(db, { seed: false, locale: 'id', defaultCategories: false });
});
afterEach(() => db.close());

const count = async (table: string) => (await db.getFirstAsync<{ n: number }>(`SELECT COUNT(*) AS n FROM ${table}`))!.n;

it('adds a cash account, categories and three months of transactions', async () => {
  expect(await seedSampleData(db, { today: '2026-10-31', locale: 'id' })).toBe(true);

  const accounts = await listAccountsWithBalance(db);
  expect(accounts.map((a) => [a.name, a.currency])).toEqual([
    ['Rekening EUR', 'EUR'],
    ['Rekening IDR', 'IDR'],
    ['Dompet Tunai', 'IDR'],
  ]);
  expect(accounts.every((a) => a.balanceMinor > 0)).toBe(true);
  expect(await count('categories')).toBe(DEFAULT_CATEGORIES.length);

  const months = await db.getAllAsync<{ month: string }>('SELECT DISTINCT month FROM transactions ORDER BY month');
  expect(months.map((m) => m.month)).toEqual(['2026-08', '2026-09', '2026-10']);
  expect(await count('transactions')).toBeGreaterThanOrEqual(40);
});

it('includes EUR amounts with cents', async () => {
  await seedSampleData(db, { today: '2026-10-31', locale: 'id' });
  const withCents = await db.getFirstAsync<{ n: number }>(
    `SELECT COUNT(*) AS n FROM transactions t JOIN accounts a ON a.id = t.account_id
     WHERE a.currency = 'EUR' AND t.amount_minor % 100 <> 0`,
  );
  expect(withCents!.n).toBeGreaterThan(0);
});

it('never creates future-dated transactions', async () => {
  await seedSampleData(db, { today: '2026-10-05', locale: 'id' });
  const latest = await db.getFirstAsync<{ d: string }>('SELECT MAX(date) AS d FROM transactions');
  expect(latest!.d <= '2026-10-05').toBe(true);
});

it('runs only once, even after transactions are cleared', async () => {
  await seedSampleData(db, { today: '2026-10-31', locale: 'id' });
  const first = await count('transactions');
  expect(await seedSampleData(db, { today: '2026-10-31', locale: 'id' })).toBe(false);
  expect(await count('transactions')).toBe(first);

  await db.runAsync('DELETE FROM transactions');
  expect(await seedSampleData(db, { today: '2026-10-31', locale: 'id' })).toBe(false);
  expect(await count('transactions')).toBe(0);
});

it('reuses a renamed default account instead of recreating it', async () => {
  await db.runAsync("UPDATE accounts SET name = 'Giro' WHERE currency = 'EUR'");
  await seedSampleData(db, { today: '2026-10-31', locale: 'id' });
  const eurAccounts = await db.getAllAsync<{ name: string }>("SELECT name FROM accounts WHERE currency = 'EUR'");
  expect(eurAccounts).toEqual([{ name: 'Giro' }]);
});

it('names everything in the language given', async () => {
  await seedSampleData(db, { today: '2026-10-31', locale: 'en' });
  const accounts = await db.getAllAsync<{ name: string }>('SELECT name FROM accounts ORDER BY sort_order');
  // The defaults were created in Indonesian by initDb; the seed reuses them and adds an English cash wallet.
  expect(accounts.map((a) => a.name)).toEqual(['Rekening EUR', 'Rekening IDR', 'Cash wallet']);
  const notes = await db.getAllAsync<{ note: string }>("SELECT DISTINCT note FROM transactions WHERE note = 'Monthly salary'");
  expect(notes).toHaveLength(1);
  expect((await db.getAllAsync<{ name: string }>('SELECT name FROM categories')).map((c) => c.name)).toContain('Food & Groceries');
});

it('is skipped by initDb when the flag is off', async () => {
  const fresh = await createTestDb();
  await initDb(fresh, { seed: false, locale: 'id' });
  expect((await fresh.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM transactions'))!.n).toBe(0);
  expect((await fresh.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM accounts'))!.n).toBe(2);
  fresh.close();
});
