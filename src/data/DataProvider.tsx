import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { materializeDue } from '../db/repos/recurring';
import { todayLocal } from '../domain/dates';

interface DataContextValue {
  /** Bumps whenever data changes without a navigation (sheet saves, recurring transactions created). */
  revision: number;
  dataChanged: () => void;
}

const DataContext = createContext<DataContextValue>({ revision: 0, dataChanged: () => {} });

export const useDataRevision = () => useContext(DataContext);

/**
 * Shared data revision for screens to reload on, and the recurring-rule materializer: due
 * occurrences become transactions at start and whenever the app returns to the foreground.
 */
export function DataProvider({ children }: { children: React.ReactNode }) {
  const db = useSQLiteContext();
  const [revision, setRevision] = useState(0);
  const dataChanged = useCallback(() => setRevision((r) => r + 1), []);

  useEffect(() => {
    const materialize = () =>
      materializeDue(db, todayLocal())
        .then((created) => created > 0 && dataChanged())
        .catch(console.error);
    materialize();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') materialize();
    });
    return () => subscription.remove();
  }, [db, dataChanged]);

  const value = useMemo(() => ({ revision, dataChanged }), [revision, dataChanged]);
  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}
