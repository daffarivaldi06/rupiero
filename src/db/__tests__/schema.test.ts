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

describe('transfers and fx_rates (v2)', () => {
  let idrId: number;
  beforeEach(async () => {
    idrId = (await db.getFirstAsync<{ id: number }>("SELECT id FROM accounts WHERE currency = 'IDR'"))!.id;
  });

  const insertTransfer = (overrides: Partial<Record<string, number | string>> = {}) => {
    const row = { from: eurId, to: idrId, fromAmount: 20000, toAmount: 3_420_000, fee: 150, date: '2026-10-30', ...overrides };
    return db.runAsync(
      `INSERT INTO transfers (from_account_id, to_account_id, from_amount_minor, to_amount_minor, fee_minor, date)
       VALUES (?, ?, ?, ?, ?, ?)`,
      row.from,
      row.to,
      row.fromAmount,
      row.toAmount,
      row.fee,
      row.date,
    );
  };

  it('stores a transfer with its month and rejects invalid ones', async () => {
    const { lastInsertRowId } = await insertTransfer();
    expect(await db.getFirstAsync('SELECT month FROM transfers WHERE id = ?', lastInsertRowId)).toEqual({ month: '2026-10' });
    await expect(insertTransfer({ to: eurId })).rejects.toThrow(/CHECK/);
    await expect(insertTransfer({ fromAmount: 0 })).rejects.toThrow(/CHECK/);
    await expect(insertTransfer({ fee: -1 })).rejects.toThrow(/CHECK/);
    await expect(insertTransfer({ date: '30-10-2026' })).rejects.toThrow(/CHECK/);
  });

  it('keeps accounts with transfers from being deleted', async () => {
    await insertTransfer();
    await expect(db.runAsync('DELETE FROM accounts WHERE id = ?', idrId)).rejects.toThrow(/FOREIGN KEY/);
  });

  it('only stores EUR→IDR rates, one per date', async () => {
    await db.runAsync("INSERT INTO fx_rates (date, rate_micro) VALUES ('2026-10-30', 20275170000)");
    expect(await db.getFirstAsync('SELECT base, quote, source FROM fx_rates')).toEqual({
      base: 'EUR',
      quote: 'IDR',
      source: 'ecb-frankfurter',
    });
    await expect(db.runAsync("INSERT INTO fx_rates (date, rate_micro) VALUES ('2026-10-30', 1)")).rejects.toThrow(/UNIQUE|PRIMARY/);
    await expect(
      db.runAsync("INSERT INTO fx_rates (date, base, quote, rate_micro) VALUES ('2026-10-29', 'IDR', 'EUR', 49)"),
    ).rejects.toThrow(/CHECK/);
    await expect(db.runAsync("INSERT INTO fx_rates (date, rate_micro) VALUES ('2026-10-28', 0)")).rejects.toThrow(/CHECK/);
  });

  it('puts every movement in the ledger view with its sign', async () => {
    await insertTx({ type: 'income', amount_minor: 5000 });
    await insertTransfer();
    await insertTransfer({ fee: 0, fromAmount: 100, toAmount: 17_100 });
    const rows = await db.getAllAsync<{ kind: string; account_id: number; signed_minor: number }>(
      'SELECT kind, account_id, signed_minor FROM ledger ORDER BY kind, signed_minor',
    );
    expect(rows).toEqual([
      { kind: 'transfer_fee', account_id: eurId, signed_minor: -150 },
      { kind: 'transfer_in', account_id: idrId, signed_minor: 17_100 },
      { kind: 'transfer_in', account_id: idrId, signed_minor: 3_420_000 },
      { kind: 'transfer_out', account_id: eurId, signed_minor: -20000 },
      { kind: 'transfer_out', account_id: eurId, signed_minor: -100 },
      { kind: 'tx', account_id: eurId, signed_minor: 5000 },
    ]);
  });
});
