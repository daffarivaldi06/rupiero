import { SEED_SAMPLE_DATA } from '../config/dev';
import type { Locale } from '../i18n/locale';
import { loadLocale } from '../i18n/system';
import { setUserVersion, type Db } from './client';
import { ensureDefaults } from './defaults';
import { notifyDataChanged } from './events';
import { migrate } from './migrations';
import { seedSampleData } from './seed';

export const DATABASE_NAME = 'budget.db';

/** Per-connection settings. Must run outside a transaction, so call it before anything else. */
export async function configureConnection(db: Db): Promise<void> {
  // WAL lets the widget's connection read while the app writes.
  // First, so even the pragmas below wait for a lock held by the widget's connection (or the app's)
  // instead of failing with "database is locked".
  await db.execAsync('PRAGMA busy_timeout = 5000');
  await db.execAsync('PRAGMA journal_mode = WAL');
  await db.execAsync('PRAGMA foreign_keys = ON');
}

export interface InitOptions {
  seed?: boolean;
  /** Language for default names; by default the stored choice or the phone's language (also applied to the UI). */
  locale?: Locale;
  /** Create the default categories in an empty database (tests that build their own turn this off). */
  defaultCategories?: boolean;
}

/**
 * Opens the schema for use: pragmas, migrations, the UI language, default accounts and categories,
 * dev seed. Called once per connection (DatabaseProvider).
 */
export async function initDb(db: Db, options: InitOptions = {}): Promise<void> {
  await configureConnection(db);
  await migrate(db);
  const locale = options.locale ?? (await loadLocale(db));
  await ensureDefaults(db, locale, { categories: options.defaultCategories });
  if (options.seed ?? SEED_SAMPLE_DATA) await seedSampleData(db, { locale });
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
