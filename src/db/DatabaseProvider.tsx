import React, { createContext, useContext, useEffect, useState } from 'react';
import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';
import { DATABASE_NAME, initDb } from './init';

// One connection per process, shared by the app and the home-screen widget task. The widget task
// runs in the app's JS runtime when the app is alive, and expo-sqlite shares native connections by
// name: a second connection that gets closed (or garbage-collected) releases the app's as well,
// after which every query fails. So the database is opened and migrated once and never closed.
let connection: Promise<SQLiteDatabase> | null = null;

export function getDatabase(): Promise<SQLiteDatabase> {
  if (!connection) {
    connection = (async () => {
      const db = await openDatabaseAsync(DATABASE_NAME);
      await initDb(db);
      return db;
    })();
    // Let a later call try again if opening failed.
    connection.catch(() => {
      connection = null;
    });
  }
  return connection;
}

const DatabaseContext = createContext<SQLiteDatabase | null>(null);

/** Renders children once the shared connection is open and migrated (the splash covers the wait). */
export function DatabaseProvider({ children }: { children: React.ReactNode }) {
  const [db, setDb] = useState<SQLiteDatabase | null>(null);

  useEffect(() => {
    let cancelled = false;
    getDatabase()
      .then((opened) => !cancelled && setDb(opened))
      .catch(console.error);
    return () => {
      cancelled = true;
    };
  }, []);

  return db ? <DatabaseContext.Provider value={db}>{children}</DatabaseContext.Provider> : null;
}

/** The app's database connection (same name and role as expo-sqlite's hook it replaces). */
export function useSQLiteContext(): SQLiteDatabase {
  const db = useContext(DatabaseContext);
  if (!db) throw new Error('useSQLiteContext must be used inside DatabaseProvider');
  return db;
}
