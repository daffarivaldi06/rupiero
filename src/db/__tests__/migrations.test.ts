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
    expect(await tableNames()).toEqual(['accounts', 'categories', 'settings', 'transactions']);
    expect(await columnNames('transactions')).toEqual(
      expect.arrayContaining(['account_id', 'category_id', 'amount_minor', 'date', 'month']),
    );
  });

  it('creates the two default accounts', async () => {
    await migrate(db);
    expect(await accounts()).toEqual([
      { name: 'Rekening EUR', currency: 'EUR' },
      { name: 'Rekening IDR', currency: 'IDR' },
    ]);
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
    expect(await accounts()).toHaveLength(2);
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
    expect(await accounts()).toHaveLength(2);
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

describe('resetDatabase', () => {
  it('rebuilds from scratch', async () => {
    await initDb(db);
    await db.runAsync("INSERT INTO accounts (name, currency) VALUES ('Dompet', 'IDR')");
    await db.runAsync("INSERT INTO categories (name) VALUES ('Sewa')");
    await db.runAsync("INSERT INTO transactions (account_id, category_id, type, amount_minor, date) VALUES (3, 1, 'expense', 100, '2026-10-01')");

    await resetDatabase(db);

    expect(await getUserVersion(db)).toBe(LATEST);
    expect(await accounts()).toHaveLength(2);
    expect(await db.getFirstAsync('SELECT COUNT(*) AS n FROM transactions')).toEqual({ n: 0 });
  });
});
