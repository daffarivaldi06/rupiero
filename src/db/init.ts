import { SEED_SAMPLE_DATA } from '../config/dev';
import { setUserVersion, type Db } from './client';
import { notifyDataChanged } from './events';
import { migrate } from './migrations';
import { seedSampleData } from './seed';

export const DATABASE_NAME = 'budget.db';

/** Per-connection settings. Must run outside a transaction, so call it before anything else. */
export async function configureConnection(db: Db): Promise<void> {
  // WAL lets the widget's connection read while the app writes.
  await db.execAsync('PRAGMA journal_mode = WAL');
  await db.execAsync('PRAGMA foreign_keys = ON');
  // The widget writes through its own connection; wait for a lock instead of failing at once.
  await db.execAsync('PRAGMA busy_timeout = 3000');
}

export interface InitOptions {
  seed?: boolean;
}

/** Used as SQLiteProvider's onInit. */
export async function initDb(db: Db, options: InitOptions = {}): Promise<void> {
  await configureConnection(db);
  await migrate(db);
  if (options.seed ?? SEED_SAMPLE_DATA) await seedSampleData(db);
}

/** Development only: drops every table and view, then initialises again with sample data. */
export async function resetDatabase(db: Db, options: InitOptions = { seed: true }): Promise<void> {
  const objects = await db.getAllAsync<{ type: 'table' | 'view'; name: string }>(
    "SELECT type, name FROM sqlite_master WHERE type IN ('table', 'view') AND name NOT LIKE 'sqlite_%'",
  );
  await db.execAsync('PRAGMA foreign_keys = OFF');
  try {
    await db.withTransactionAsync(async () => {
      for (const { type, name } of objects) {
        await db.execAsync(`DROP ${type === 'view' ? 'VIEW' : 'TABLE'} IF EXISTS "${name}"`);
      }
      await setUserVersion(db, 0);
    });
  } finally {
    await db.execAsync('PRAGMA foreign_keys = ON');
  }
  await initDb(db, options);
  notifyDataChanged();
}
