import { createTestDb, type TestDb } from '../../../test/sqljs-db';
import { initDb } from '../init';
import { listAccountsWithBalance } from '../repos/accounts';
import { SAMPLE_CATEGORIES, seedSampleData } from '../seed';

let db: TestDb;
beforeEach(async () => {
  db = await createTestDb();
  await initDb(db, { seed: false });
});
afterEach(() => db.close());

const count = async (table: string) => (await db.getFirstAsync<{ n: number }>(`SELECT COUNT(*) AS n FROM ${table}`))!.n;

it('adds a cash account, categories and three months of transactions', async () => {
  expect(await seedSampleData(db, '2026-10-31')).toBe(true);

  const accounts = await listAccountsWithBalance(db);
  expect(accounts.map((a) => [a.name, a.currency])).toEqual([
    ['Rekening EUR', 'EUR'],
    ['Rekening IDR', 'IDR'],
    ['Dompet Tunai', 'IDR'],
  ]);
  expect(accounts.every((a) => a.balanceMinor > 0)).toBe(true);
  expect(await count('categories')).toBe(SAMPLE_CATEGORIES.length);

  const months = await db.getAllAsync<{ month: string }>('SELECT DISTINCT month FROM transactions ORDER BY month');
  expect(months.map((m) => m.month)).toEqual(['2026-08', '2026-09', '2026-10']);
  expect(await count('transactions')).toBeGreaterThanOrEqual(40);
});

it('includes EUR amounts with cents', async () => {
  await seedSampleData(db, '2026-10-31');
  const withCents = await db.getFirstAsync<{ n: number }>(
    `SELECT COUNT(*) AS n FROM transactions t JOIN accounts a ON a.id = t.account_id
     WHERE a.currency = 'EUR' AND t.amount_minor % 100 <> 0`,
  );
  expect(withCents!.n).toBeGreaterThan(0);
});

it('never creates future-dated transactions', async () => {
  await seedSampleData(db, '2026-10-05');
  const latest = await db.getFirstAsync<{ d: string }>('SELECT MAX(date) AS d FROM transactions');
  expect(latest!.d <= '2026-10-05').toBe(true);
});

it('runs only once, even after transactions are cleared', async () => {
  await seedSampleData(db, '2026-10-31');
  const first = await count('transactions');
  expect(await seedSampleData(db, '2026-10-31')).toBe(false);
  expect(await count('transactions')).toBe(first);

  await db.runAsync('DELETE FROM transactions');
  expect(await seedSampleData(db, '2026-10-31')).toBe(false);
  expect(await count('transactions')).toBe(0);
});

it('reuses a renamed default account instead of recreating it', async () => {
  await db.runAsync("UPDATE accounts SET name = 'Giro' WHERE currency = 'EUR'");
  await seedSampleData(db, '2026-10-31');
  const eurAccounts = await db.getAllAsync<{ name: string }>("SELECT name FROM accounts WHERE currency = 'EUR'");
  expect(eurAccounts).toEqual([{ name: 'Giro' }]);
});

it('is skipped by initDb when the flag is off', async () => {
  const fresh = await createTestDb();
  await initDb(fresh, { seed: false });
  expect((await fresh.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM transactions'))!.n).toBe(0);
  expect((await fresh.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM accounts'))!.n).toBe(2);
  fresh.close();
});
