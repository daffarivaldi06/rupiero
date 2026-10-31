import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { onDataChanged } from '../db/events';
import { materializeDue } from '../db/repos/recurring';
import { todayLocal } from '../domain/dates';

interface DataContextValue {
  /** Bumps after every repo write (see db/events), so screens can reload without a navigation. */
  revision: number;
}

const DataContext = createContext<DataContextValue>({ revision: 0 });

export const useDataRevision = () => useContext(DataContext);

/**
 * Shared data revision for screens to reload on, and the recurring-rule materializer: due
 * occurrences become transactions at start and whenever the app returns to the foreground.
 */
export function DataProvider({ children }: { children: React.ReactNode }) {
  const db = useSQLiteContext();
  const [revision, setRevision] = useState(0);
  const bump = useCallback(() => setRevision((r) => r + 1), []);

  useEffect(() => onDataChanged(bump), [bump]);

  useEffect(() => {
    // materializeDue reports its own changes through db/events.
    const materialize = () => materializeDue(db, todayLocal()).catch(console.error);
    materialize();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') materialize();
    });
    return () => subscription.remove();
  }, [db]);

  const value = useMemo(() => ({ revision }), [revision]);
  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}
