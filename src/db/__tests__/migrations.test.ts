import { createTestDb, type TestDb } from '../../../test/sqljs-db';
import { getUserVersion, setUserVersion } from '../client';
import { configureConnection, initDb, resetDatabase } from '../init';
import { migrate, MIGRATIONS, SchemaTooNewError } from '../migrations';

const LATEST = MIGRATIONS[MIGRATIONS.length - 1].version;

let db: TestDb;
beforeEach(async () => {
  db = await createTestDb();
  await configureConnection(db);
});
afterEach(() => db.close());

const tableNames = async () =>
  (
    await db.getAllAsync<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
    )
  ).map((r) => r.name);

const columnNames = async (table: string) =>
  (await db.getAllAsync<{ name: string }>(`PRAGMA table_xinfo(${table})`)).map((r) => r.name);

const accounts = () => db.getAllAsync<{ name: string; currency: string }>('SELECT name, currency FROM accounts ORDER BY sort_order');

describe('migrate', () => {
  it('creates the schema on an empty database', async () => {
    await migrate(db);

    expect(await getUserVersion(db)).toBe(LATEST);
    expect(await tableNames()).toEqual(['accounts', 'budgets', 'categories', 'fx_rates', 'recurring_rules', 'settings', 'transactions', 'transfers']);
    expect(await columnNames('transactions')).toContain('recurring_rule_id');
    expect(await db.getAllAsync("SELECT name FROM sqlite_master WHERE type = 'view'")).toEqual([{ name: 'ledger' }]);
    expect(await db.getFirstAsync("SELECT value FROM settings WHERE key = 'base_currency'")).toEqual({ value: 'EUR' });
    expect(await columnNames('transactions')).toEqual(
      expect.arrayContaining(['account_id', 'category_id', 'amount_minor', 'date', 'month']),
    );
  });

  it('creates no accounts itself (defaults come from initDb, in the install language)', async () => {
    await migrate(db);
    expect(await accounts()).toEqual([]);
  });

  it('drops a legacy unversioned schema and recreates it', async () => {
    await db.execAsync(`
      CREATE TABLE transactions (id INTEGER PRIMARY KEY AUTOINCREMENT, amount REAL NOT NULL, type TEXT NOT NULL,
        category TEXT NOT NULL, note TEXT, date TEXT NOT NULL, currency TEXT NOT NULL DEFAULT 'IDR',
        is_recurring INTEGER NOT NULL DEFAULT 0);
      CREATE TABLE categories (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE);
      CREATE TABLE settings (id INTEGER PRIMARY KEY CHECK (id = 1), displayCurrency TEXT NOT NULL DEFAULT 'IDR',
        eurToIdrRate REAL NOT NULL DEFAULT 17000);
      INSERT INTO categories (name) VALUES ('Prancis');
      INSERT INTO transactions (amount, type, category, date) VALUES (1250, 'expense', 'Prancis', '2026-04-18T10:00:00.000Z');
      INSERT INTO settings (id) VALUES (1);
    `);
    expect(await getUserVersion(db)).toBe(0);

    await migrate(db);

    expect(await getUserVersion(db)).toBe(LATEST);
    expect(await columnNames('transactions')).not.toContain('amount');
    expect(await columnNames('settings')).toEqual(['key', 'value']);
    expect(await db.getFirstAsync('SELECT COUNT(*) AS n FROM transactions')).toEqual({ n: 0 });
    expect(await db.getFirstAsync('SELECT COUNT(*) AS n FROM categories')).toEqual({ n: 0 });
    expect(await accounts()).toHaveLength(0);
  });

  it('refuses a schema newer than the app and leaves it untouched', async () => {
    await db.execAsync('CREATE TABLE future_table (id INTEGER PRIMARY KEY)');
    await setUserVersion(db, LATEST + 1);

    await expect(migrate(db)).rejects.toBeInstanceOf(SchemaTooNewError);
    expect(await getUserVersion(db)).toBe(LATEST + 1);
    expect(await tableNames()).toEqual(['future_table']);
  });

  it('is a no-op when already up to date', async () => {
    await migrate(db);
    await db.runAsync("INSERT INTO categories (name) VALUES ('Sewa')");

    await migrate(db);

    expect(await db.getFirstAsync('SELECT COUNT(*) AS n FROM categories')).toEqual({ n: 1 });
    expect(await accounts()).toHaveLength(0);
  });

  it('rolls everything back when a step fails', async () => {
    const failing = [
      ...MIGRATIONS,
      {
        version: LATEST + 1,
        async up() {
          throw new Error('boom');
        },
      },
    ];

    await expect(migrate(db, failing)).rejects.toThrow('boom');
    expect(await getUserVersion(db)).toBe(0);
    expect(await tableNames()).toEqual([]);
  });
});

describe('v2 → v3', () => {
  it('keeps existing data and adds budgets, recurring rules and the rule link', async () => {
    await migrate(db, MIGRATIONS.slice(0, 2));
    expect(await getUserVersion(db)).toBe(2);
    const eur = (await db.runAsync("INSERT INTO accounts (name, currency) VALUES ('Rekening EUR', 'EUR')")).lastInsertRowId;
    const cat = (await db.runAsync("INSERT INTO categories (name) VALUES ('Sewa')")).lastInsertRowId;
    await db.runAsync(
      "INSERT INTO transactions (account_id, category_id, type, amount_minor, date) VALUES (?, ?, 'expense', 65000, '2026-10-03')",
      eur,
      cat,
    );

    await migrate(db);

    expect(await getUserVersion(db)).toBe(3);
    expect(await db.getAllAsync('SELECT amount_minor, recurring_rule_id FROM transactions')).toEqual([
      { amount_minor: 65000, recurring_rule_id: null },
    ]);
    const rule = await db.runAsync(
      `INSERT INTO recurring_rules (account_id, category_id, type, amount_minor, frequency, interval_count, start_date)
       VALUES (?, ?, 'expense', 65000, 'daily', 2, '2026-10-30')`,
      eur,
      cat,
    );
    const insertOccurrence = () =>
      db.runAsync(
        "INSERT INTO transactions (account_id, category_id, type, amount_minor, date, recurring_rule_id) VALUES (?, ?, 'expense', 65000, '2026-10-30', ?)",
        eur,
        cat,
        rule.lastInsertRowId,
      );
    await insertOccurrence();
    await expect(insertOccurrence()).rejects.toThrow(/UNIQUE/);
  });

  it('enforces the new constraints', async () => {
    await migrate(db);
    const eur = (await db.runAsync("INSERT INTO accounts (name, currency) VALUES ('Rekening EUR', 'EUR')")).lastInsertRowId;
    const cat = (await db.runAsync("INSERT INTO categories (name) VALUES ('Sewa')")).lastInsertRowId;
    const rule = (frequency: string, end: string | null = null) =>
      db.runAsync(
        `INSERT INTO recurring_rules (account_id, category_id, type, amount_minor, frequency, start_date, end_date)
         VALUES (?, ?, 'expense', 100, ?, '2026-10-01', ?)`,
        eur,
        cat,
        frequency,
        end,
      );
    await expect(rule('hourly')).rejects.toThrow(/CHECK/);
    await expect(rule('monthly', '2026-09-30')).rejects.toThrow(/CHECK/);
    const budget = (limit: number) =>
      db.runAsync("INSERT INTO budgets (category_id, month, currency, limit_minor) VALUES (?, '2026-10', 'EUR', ?)", cat, limit);
    await expect(budget(0)).rejects.toThrow(/CHECK/);
    await budget(30000);
    await expect(budget(20000)).rejects.toThrow(/UNIQUE/);
  });

  it('unlinks generated transactions when their rule is deleted', async () => {
    await migrate(db);
    const eur = (await db.runAsync("INSERT INTO accounts (name, currency) VALUES ('Rekening EUR', 'EUR')")).lastInsertRowId;
    const cat = (await db.runAsync("INSERT INTO categories (name) VALUES ('Sewa')")).lastInsertRowId;
    const rule = await db.runAsync(
      "INSERT INTO recurring_rules (account_id, category_id, type, amount_minor, frequency, start_date) VALUES (?, ?, 'expense', 100, 'monthly', '2026-10-01')",
      eur,
      cat,
    );
    await db.runAsync(
      "INSERT INTO transactions (account_id, category_id, type, amount_minor, date, recurring_rule_id) VALUES (?, ?, 'expense', 100, '2026-10-01', ?)",
      eur,
      cat,
      rule.lastInsertRowId,
    );
    await db.runAsync('DELETE FROM recurring_rules WHERE id = ?', rule.lastInsertRowId);
    expect(await db.getAllAsync('SELECT recurring_rule_id FROM transactions')).toEqual([{ recurring_rule_id: null }]);
  });
});

describe('default accounts and categories', () => {
  const categoryNames = async () => (await db.getAllAsync<{ name: string }>('SELECT name FROM categories ORDER BY sort_order')).map((c) => c.name);

  it('creates two accounts and eight categories in Indonesian', async () => {
    await initDb(db, { seed: false, locale: 'id' });
    expect(await accounts()).toEqual([
      { name: 'Rekening EUR', currency: 'EUR' },
      { name: 'Rekening IDR', currency: 'IDR' },
    ]);
    expect(await categoryNames()).toEqual(['Gaji', 'Sewa', 'Makanan & Belanja', 'Transportasi', 'Tagihan', 'Hiburan', 'Kesehatan', 'Lainnya']);
  });

  it('creates them in English when that is the install language', async () => {
    await initDb(db, { seed: false, locale: 'en' });
    expect(await accounts()).toEqual([
      { name: 'EUR account', currency: 'EUR' },
      { name: 'IDR account', currency: 'IDR' },
    ]);
    expect(await categoryNames()).toEqual(['Salary', 'Rent', 'Food & Groceries', 'Transport', 'Bills', 'Entertainment', 'Health', 'Other']);
  });

  it('runs once: deleted defaults stay deleted, and names are never translated later', async () => {
    await initDb(db, { seed: false, locale: 'id' });
    await db.runAsync('DELETE FROM categories');
    await initDb(db, { seed: false, locale: 'en' });
    expect(await categoryNames()).toEqual([]);
    expect((await accounts()).map((a) => a.name)).toEqual(['Rekening EUR', 'Rekening IDR']);
  });

  it('leaves an existing database with its own accounts and categories alone', async () => {
    await migrate(db);
    await db.runAsync("INSERT INTO accounts (name, currency) VALUES ('Giro', 'EUR')");
    await db.runAsync("INSERT INTO categories (name) VALUES ('Kopi')");
    await initDb(db, { seed: false, locale: 'en' });
    expect(await accounts()).toEqual([{ name: 'Giro', currency: 'EUR' }]);
    expect(await categoryNames()).toEqual(['Kopi']);
  });

  it('adds categories to an existing database that has accounts but none', async () => {
    await migrate(db);
    await db.runAsync("INSERT INTO accounts (name, currency) VALUES ('Giro', 'EUR')");
    await initDb(db, { seed: false, locale: 'id' });
    expect(await accounts()).toEqual([{ name: 'Giro', currency: 'EUR' }]);
    expect(await categoryNames()).toHaveLength(8);
  });
});

describe('resetDatabase', () => {
  it('rebuilds from scratch without sample data when asked', async () => {
    await initDb(db, { seed: false, locale: 'id', defaultCategories: false });
    await db.runAsync("INSERT INTO accounts (name, currency) VALUES ('Dompet', 'IDR')");
    await db.runAsync("INSERT INTO categories (name) VALUES ('Sewa')");
    await db.runAsync("INSERT INTO transactions (account_id, category_id, type, amount_minor, date) VALUES (3, 1, 'expense', 100, '2026-10-01')");

    await resetDatabase(db, { seed: false, locale: 'id' });

    expect(await getUserVersion(db)).toBe(LATEST);
    expect(await accounts()).toHaveLength(2);
    expect(await db.getFirstAsync('SELECT COUNT(*) AS n FROM transactions')).toEqual({ n: 0 });
  });
});
