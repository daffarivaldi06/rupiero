import { createTestDb, type TestDb } from '../../../test/sqljs-db';
import { initDb } from '../init';

let db: TestDb;
let eurId: number;
let categoryId: number;

beforeEach(async () => {
  db = await createTestDb();
  await initDb(db, { seed: false });
  eurId = (await db.getFirstAsync<{ id: number }>("SELECT id FROM accounts WHERE currency = 'EUR'"))!.id;
  categoryId = (await db.runAsync("INSERT INTO categories (name) VALUES ('Sewa')")).lastInsertRowId;
});
afterEach(() => db.close());

const insertTx = (overrides: Partial<Record<string, string | number>> = {}) => {
  const row = { account_id: eurId, category_id: categoryId, type: 'expense', amount_minor: 1250, date: '2026-10-01', ...overrides };
  return db.runAsync(
    'INSERT INTO transactions (account_id, category_id, type, amount_minor, date) VALUES (?, ?, ?, ?, ?)',
    row.account_id,
    row.category_id,
    row.type,
    row.amount_minor,
    row.date,
  );
};

it('derives month from the local date', async () => {
  const { lastInsertRowId } = await insertTx({ date: '2026-10-31' });
  expect(await db.getFirstAsync('SELECT month FROM transactions WHERE id = ?', lastInsertRowId)).toEqual({
    month: '2026-10',
  });
});

it('enforces foreign keys', async () => {
  await expect(insertTx({ account_id: 999 })).rejects.toThrow(/FOREIGN KEY/);
  await expect(insertTx({ category_id: 999 })).rejects.toThrow(/FOREIGN KEY/);
});

it('restricts deleting accounts and categories that are in use', async () => {
  await insertTx();
  await expect(db.runAsync('DELETE FROM accounts WHERE id = ?', eurId)).rejects.toThrow(/FOREIGN KEY/);
  await expect(db.runAsync('DELETE FROM categories WHERE id = ?', categoryId)).rejects.toThrow(/FOREIGN KEY/);
});

it('only accepts positive integer amounts', async () => {
  await expect(insertTx({ amount_minor: 0 })).rejects.toThrow(/CHECK/);
  await expect(insertTx({ amount_minor: -5 })).rejects.toThrow(/CHECK/);
});

it('only accepts known types, currencies and YYYY-MM-DD dates', async () => {
  await expect(insertTx({ type: 'transfer' })).rejects.toThrow(/CHECK/);
  await expect(insertTx({ date: '2026-10-01T10:00:00.000Z' })).rejects.toThrow(/CHECK/);
  await expect(db.runAsync("INSERT INTO accounts (name, currency) VALUES ('Dollar', 'USD')")).rejects.toThrow(/CHECK/);
});

it('treats account and category names as case-insensitively unique', async () => {
  await expect(db.runAsync("INSERT INTO categories (name) VALUES ('sewa')")).rejects.toThrow(/UNIQUE/);
  await expect(db.runAsync("INSERT INTO accounts (name, currency) VALUES ('rekening eur', 'EUR')")).rejects.toThrow(
    /UNIQUE/,
  );
});

it('indexes month/category and account/date lookups', async () => {
  const plan = await db.getAllAsync<{ detail: string }>(
    "EXPLAIN QUERY PLAN SELECT * FROM transactions WHERE month = '2026-10' AND category_id = 1",
  );
  expect(plan.map((p) => p.detail).join(' ')).toContain('idx_tx_month_category');
});
