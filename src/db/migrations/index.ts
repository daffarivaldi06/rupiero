import { getUserVersion, setUserVersion, type Db } from '../client';
import { migration001 } from './001_initial';
import { migration002 } from './002_transfers_fx';
import { migration003 } from './003_budgets_recurring';

export interface Migration {
  version: number;
  up(db: Db): Promise<void>;
}

export const MIGRATIONS: Migration[] = [migration001, migration002, migration003];

/** Tables of the unversioned pre-overhaul schema. Its data was test-only and is not migrated. */
const LEGACY_TABLES = ['transactions', 'categories', 'settings'];

export class SchemaTooNewError extends Error {
  constructor(found: number, supported: number) {
    // i18n-ignore: logged; the start-up error screen explains it to the user.
    super(`Database schema v${found} is newer than this app supports (v${supported}). Update the app.`);
    this.name = 'SchemaTooNewError';
  }
}

async function dropLegacyTables(db: Db) {
  // One table per statement: SQLite's DROP TABLE takes a single table name.
  for (const table of LEGACY_TABLES) {
    await db.execAsync(`DROP TABLE IF EXISTS ${table}`);
  }
}

/**
 * Brings the schema up to the latest version. All pending steps (including dropping a legacy
 * schema found at user_version 0) run in one transaction, so a failure leaves the file untouched.
 */
export async function migrate(db: Db, migrations: Migration[] = MIGRATIONS): Promise<void> {
  const latest = migrations[migrations.length - 1].version;
  const current = await getUserVersion(db);
  if (current > latest) throw new SchemaTooNewError(current, latest);

  const pending = migrations.filter((m) => m.version > current);
  if (pending.length === 0) return;

  await db.withTransactionAsync(async () => {
    if (current === 0) await dropLegacyTables(db);
    for (const migration of pending) {
      await migration.up(db);
      await setUserVersion(db, migration.version);
    }
  });
}
