// The subset of expo-sqlite's SQLiteDatabase the data layer relies on. Keeping it this small lets
// tests run the same SQL against sql.js (see test/sqljs-db.ts), and an expo SQLiteDatabase
// satisfies it structurally, so screens can pass `useSQLiteContext()` straight through.

export type SQLParam = string | number | null;

export interface RunResult {
  lastInsertRowId: number;
  changes: number;
}

export interface Db {
  execAsync(source: string): Promise<void>;
  runAsync(source: string, ...params: SQLParam[]): Promise<RunResult>;
  getFirstAsync<T>(source: string, ...params: SQLParam[]): Promise<T | null>;
  getAllAsync<T>(source: string, ...params: SQLParam[]): Promise<T[]>;
  withTransactionAsync(task: () => Promise<void>): Promise<void>;
}

export async function getUserVersion(db: Db): Promise<number> {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  return row?.user_version ?? 0;
}

export async function setUserVersion(db: Db, version: number): Promise<void> {
  if (!Number.isInteger(version) || version < 0) throw new RangeError(`Invalid schema version ${version}`);
  // PRAGMA values cannot be bound as parameters.
  await db.execAsync(`PRAGMA user_version = ${version}`);
}
