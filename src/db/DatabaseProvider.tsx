import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';
import { applyThemePreference } from '../theme/themePreference';
import { ErrorScreen } from '../feedback/ErrorScreen';
import { t } from '../i18n';
import { getLocale, resolveLocale, setLocale } from '../i18n/locale';
import { systemLanguageCodes } from '../i18n/system';
import { useIntro } from '../intro/IntroProvider';
import { SchemaTooNewError } from './migrations';
import { DATABASE_NAME, initDb } from './init';
import { getThemePreference } from './repos/settings';
import { serializeTransactions } from './serialize';
// Web: must load before the database opens (see pageLifecycle.web.ts). Empty on native.
import './pageLifecycle';
import { isOpenInAnotherTab, retryStartup } from './startupRecovery';

// One connection per process, shared by the app and the home-screen widget task. The widget task
// runs in the app's JS runtime when the app is alive, and expo-sqlite shares native connections by
// name: a second connection that gets closed (or garbage-collected) releases the app's as well,
// after which every query fails. So the database is opened and migrated once and never closed.
let connection: Promise<SQLiteDatabase> | null = null;

export function getDatabase(): Promise<SQLiteDatabase> {
  if (!connection) {
    connection = (async () => {
      const db = serializeTransactions(await openDatabaseAsync(DATABASE_NAME));
      await initDb(db);
      // Before the first screen renders, so a chosen theme does not flash the system one.
      applyThemePreference(await getThemePreference(db));
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

/**
 * Renders children once the shared connection is open and migrated (the splash covers the wait). If
 * that fails, says why with a retry instead of staying blank; nothing has been changed by then
 * (migrations run in one transaction).
 */
export function DatabaseProvider({ children }: { children: React.ReactNode }) {
  const [db, setDb] = useState<SQLiteDatabase | null>(null);
  const [error, setError] = useState<Error | null>(null);
  // Web: the database is held by Rupiero in another tab (always false on native).
  const [anotherTab, setAnotherTab] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const intro = useIntro();

  useEffect(() => {
    let cancelled = false;
    getDatabase()
      .then((opened) => !cancelled && setDb(opened))
      .catch((e: unknown) => {
        console.error(e);
        if (cancelled) return;
        // The stored language could not be read; the phone's is the best guess.
        setLocale(resolveLocale('system', systemLanguageCodes()));
        const failure = e instanceof Error ? e : new Error(String(e));
        setAnotherTab(isOpenInAnotherTab(failure));
        setError(failure);
        intro.ready();
      });
    return () => {
      cancelled = true;
    };
  }, [attempt, intro]);

  const retry = useCallback(() => {
    setError(null);
    setAttempt((n) => n + 1);
  }, []);

  if (error) {
    const tooNew = error instanceof SchemaTooNewError;
    return (
      <ErrorScreen
        key={getLocale()}
        title={t('startup.title')}
        message={t(tooNew ? 'startup.schemaTooNew' : anotherTab ? 'startup.openInAnotherTab' : 'startup.failed')}
        detail={tooNew || anotherTab ? undefined : error.message}
        // Native: open again in the app. Web: reload the page (startupRecovery.web.ts).
        onRetry={() => retryStartup(retry)}
      />
    );
  }
  return db ? <DatabaseContext.Provider value={db}>{children}</DatabaseContext.Provider> : null;
}

/** The app's database connection (same name and role as expo-sqlite's hook it replaces). */
export function useSQLiteContext(): SQLiteDatabase {
  const db = useContext(DatabaseContext);
  if (!db) throw new Error('useSQLiteContext must be used inside DatabaseProvider');
  return db;
}
