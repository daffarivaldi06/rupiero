// JSON backup of everything except device settings. Import validates the file completely before
// touching the database, then replaces all data in one transaction: it fully succeeds or changes nothing.
import { t } from '../i18n';
import { getUserVersion, type Db, type SQLParam } from './client';
import { notifyDataChanged } from './events';

export const BACKUP_FORMAT = 'rupiero-backup';

type Kind = 'id' | 'int' | 'int?' | 'text' | 'date' | 'date?' | 'month' | 'flag' | readonly string[];

// Insert order respects foreign keys; deletes run in reverse. Generated columns (month) are left out.
const TABLES = {
  accounts: { id: 'id', name: 'text', currency: ['IDR', 'EUR'], opening_balance_minor: 'int', archived: 'flag', sort_order: 'int', created_at: 'text' },
  categories: { id: 'id', name: 'text', archived: 'flag', sort_order: 'int' },
  recurring_rules: {
    id: 'id',
    account_id: 'id',
    category_id: 'id',
    type: ['income', 'expense'],
    amount_minor: 'int',
    note: 'text',
    frequency: ['daily', 'weekly', 'monthly', 'yearly'],
    interval_count: 'int',
    start_date: 'date',
    end_date: 'date?',
    paused: 'flag',
    last_generated_date: 'date?',
    created_at: 'text',
  },
  transactions: {
    id: 'id',
    account_id: 'id',
    category_id: 'id',
    type: ['income', 'expense'],
    amount_minor: 'int',
    date: 'date',
    note: 'text',
    created_at: 'text',
    updated_at: 'text',
    recurring_rule_id: 'int?',
  },
  transfers: {
    id: 'id',
    from_account_id: 'id',
    to_account_id: 'id',
    from_amount_minor: 'int',
    to_amount_minor: 'int',
    fee_minor: 'int',
    date: 'date',
    note: 'text',
    created_at: 'text',
  },
  budgets: { id: 'id', category_id: 'id', month: 'month', currency: ['IDR', 'EUR'], limit_minor: 'int' },
  fx_rates: { date: 'date', base: ['EUR'], quote: ['IDR'], rate_micro: 'int', source: 'text', fetched_at: 'text' },
} satisfies Record<string, Record<string, Kind>>;

type TableName = keyof typeof TABLES;
const TABLE_NAMES = Object.keys(TABLES) as TableName[];
type Row = Record<string, string | number | null>;

export type BackupData = {
  format: typeof BACKUP_FORMAT;
  schemaVersion: number;
  exportedAt: string;
} & Record<TableName, Row[]>;

export class BackupError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BackupError';
  }
}

export async function exportBackup(db: Db, now: Date = new Date()): Promise<BackupData> {
  const tables = {} as Record<TableName, Row[]>;
  for (const table of TABLE_NAMES) {
    const columns = Object.keys(TABLES[table]).join(', ');
    const order = table === 'fx_rates' ? 'date' : 'id';
    tables[table] = await db.getAllAsync<Row>(`SELECT ${columns} FROM ${table} ORDER BY ${order}`);
  }
  return { format: BACKUP_FORMAT, schemaVersion: await getUserVersion(db), exportedAt: now.toISOString(), ...tables };
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;

function valid(kind: Kind, value: unknown): boolean {
  if (Array.isArray(kind)) return typeof value === 'string' && kind.includes(value);
  switch (kind) {
    case 'id':
      return Number.isSafeInteger(value) && (value as number) > 0;
    case 'int':
      return Number.isSafeInteger(value);
    case 'int?':
      return value === null || Number.isSafeInteger(value);
    case 'text':
      return typeof value === 'string';
    case 'date':
      return typeof value === 'string' && DATE.test(value);
    case 'date?':
      return value === null || (typeof value === 'string' && DATE.test(value));
    case 'month':
      return typeof value === 'string' && /^\d{4}-\d{2}$/.test(value);
    case 'flag':
      return value === 0 || value === 1;
  }
  return false;
}

/** Parses and checks a backup file; throws BackupError with a message for the user if anything is off. */
export function parseBackup(text: string, currentVersion: number): BackupData {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new BackupError(t('backup.notJson'));
  }
  const backup = data as Partial<BackupData> | null;
  if (!backup || typeof backup !== 'object' || backup.format !== BACKUP_FORMAT) {
    throw new BackupError(t('backup.notRupiero'));
  }
  if (!Number.isInteger(backup.schemaVersion)) throw new BackupError(t('backup.unknownVersion'));
  if (backup.schemaVersion! > currentVersion) {
    throw new BackupError(t('backup.newerApp'));
  }
  if (backup.schemaVersion! < currentVersion) {
    throw new BackupError(t('backup.unsupportedVersion', { found: backup.schemaVersion!, current: currentVersion }));
  }
  for (const table of TABLE_NAMES) {
    const rows = backup[table];
    if (!Array.isArray(rows)) throw new BackupError(t('backup.missingSection', { table }));
    const columns = TABLES[table] as Record<string, Kind>;
    rows.forEach((row: unknown, index) => {
      if (!row || typeof row !== 'object') throw new BackupError(t('backup.brokenRow', { row: index + 1, table }));
      for (const [column, kind] of Object.entries(columns)) {
        if (!valid(kind, (row as Row)[column])) {
          throw new BackupError(t('backup.invalidValue', { column, row: index + 1, table }));
        }
      }
    });
  }
  return backup as BackupData;
}

/** Replaces all data with the backup in one transaction. Settings on this device are kept. */
export async function importBackup(db: Db, backup: BackupData): Promise<void> {
  try {
    await db.withTransactionAsync(async () => {
      for (const table of [...TABLE_NAMES].reverse()) await db.runAsync(`DELETE FROM ${table}`);
      for (const table of TABLE_NAMES) {
        const columns = Object.keys(TABLES[table]);
        const sql = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${columns.map(() => '?').join(', ')})`;
        for (const row of backup[table]) {
          await db.runAsync(sql, ...columns.map((c) => row[c] as SQLParam));
        }
      }
    });
  } catch (e) {
    if (e instanceof BackupError) throw e;
    // Constraint failures (e.g. a transaction pointing at a missing account): nothing was changed.
    throw new BackupError(t('backup.inconsistent', { detail: e instanceof Error ? e.message : String(e) }));
  }
  notifyDataChanged();
}
