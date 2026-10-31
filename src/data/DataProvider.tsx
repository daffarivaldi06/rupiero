import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';
import { useSQLiteContext } from '../db/DatabaseProvider';
import { onDataChanged } from '../db/events';
import { materializeDue } from '../db/repos/recurring';
import { todayLocal } from '../domain/dates';
import { refreshWidgets } from '../widget/refresh';

/** Writes often come in bursts (e.g. a transfer and its refresh); redraw the widget once they settle. */
const WIDGET_REFRESH_DELAY_MS = 400;

interface DataContextValue {
  /** Bumps after every repo write (see db/events), so screens can reload without a navigation. */
  revision: number;
}

const DataContext = createContext<DataContextValue>({ revision: 0 });

export const useDataRevision = () => useContext(DataContext);

/**
 * Shared data revision for screens to reload on, the widget refresh after every write, and the
 * recurring-rule materializer: due occurrences become transactions at start and whenever the app
 * returns to the foreground.
 */
export function DataProvider({ children }: { children: React.ReactNode }) {
  const db = useSQLiteContext();
  const [revision, setRevision] = useState(0);
  const bump = useCallback(() => setRevision((r) => r + 1), []);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const unsubscribe = onDataChanged(() => {
      bump();
      clearTimeout(timer);
      timer = setTimeout(() => refreshWidgets(db).catch(console.error), WIDGET_REFRESH_DELAY_MS);
    });
    return () => {
      unsubscribe();
      clearTimeout(timer);
    };
  }, [db, bump]);

  useEffect(() => {
    // materializeDue reports its own changes through db/events.
    const materialize = () => materializeDue(db, todayLocal()).catch(console.error);
    materialize();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') materialize();
    });
    return () => subscription.remove();
  }, [db]);

  // Redraw the widget whenever the app opens: after an update or a killed widget task it may still
  // show the launcher's placeholder until the next data change.
  useEffect(() => {
    refreshWidgets(db).catch(console.error);
  }, [db]);

  const value = useMemo(() => ({ revision }), [revision]);
  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}
