// In-memory implementation of the app's Db interface on sql.js (SQLite compiled to JS), so the
// real schema, migrations and queries run under Jest without a device or native build.
// The asm.js build is used because the WASM builds fail inside Jest's VM sandbox (sqlite3_open
// reports "out of memory"); they work in plain Node.
import initSqlJs from 'sql.js/dist/sql-asm.js';
import type { Database, SqlValue } from 'sql.js';

import type { Db, RunResult, SQLParam } from '../src/db/client';

let sqlJs: Awaited<ReturnType<typeof initSqlJs>> | undefined;

async function loadSqlJs() {
  // The asm.js build logs a deprecation notice on load; silence just that line.
  const warn = console.warn;
  console.warn = (...args: unknown[]) => {
    if (!String(args[0]).includes('asm.js build is deprecated')) warn(...args);
  };
  try {
    return await initSqlJs();
  } finally {
    console.warn = warn;
  }
}

export interface TestDb extends Db {
  raw: Database;
  close(): void;
}

export async function createTestDb(): Promise<TestDb> {
  sqlJs ??= await loadSqlJs();
  const raw = new sqlJs.Database();

  const all = <T>(source: string, params: SQLParam[]): T[] => {
    const stmt = raw.prepare(source);
    try {
      stmt.bind(params as SqlValue[]);
      const rows: T[] = [];
      while (stmt.step()) rows.push(stmt.getAsObject() as T);
      return rows;
    } finally {
      stmt.free();
    }
  };

  return {
    raw,
    close: () => raw.close(),
    async execAsync(source) {
      raw.exec(source);
    },
    async runAsync(source, ...params): Promise<RunResult> {
      all(source, params);
      const changes = raw.getRowsModified();
      const lastInsertRowId = Number(raw.exec('SELECT last_insert_rowid()')[0].values[0][0]);
      return { changes, lastInsertRowId };
    },
    async getFirstAsync<T>(source: string, ...params: SQLParam[]) {
      return all<T>(source, params)[0] ?? null;
    },
    async getAllAsync<T>(source: string, ...params: SQLParam[]) {
      return all<T>(source, params);
    },
    async withTransactionAsync(task) {
      raw.exec('BEGIN');
      try {
        await task();
        raw.exec('COMMIT');
      } catch (error) {
        raw.exec('ROLLBACK');
        throw error;
      }
    },
  };
}
