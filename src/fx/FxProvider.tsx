import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { useSQLiteContext } from '../db/DatabaseProvider';
import { onDataChanged } from '../db/events';
import { getLatestReferenceRate } from '../db/repos/fxRates';
import type { ReferenceRate } from '../domain/fx';
import { syncReferenceRate } from './sync';

const FxContext = createContext<ReferenceRate | null>(null);

/** The newest stored ECB EUR→IDR rate, or null if none was ever fetched (then hide "≈" figures). */
export const useReferenceRate = () => useContext(FxContext);

/** Loads the stored rate and refreshes it (at most daily) on start and whenever the app comes to the foreground. */
export function FxProvider({ children }: { children: React.ReactNode }) {
  const db = useSQLiteContext();
  const [rate, setRate] = useState<ReferenceRate | null>(null);

  const refresh = useCallback(async () => {
    try {
      setRate(await getLatestReferenceRate(db));
      if ((await syncReferenceRate(db)) === 'updated') setRate(await getLatestReferenceRate(db));
    } catch (e) {
      console.error(e);
    }
  }, [db]);

  useEffect(() => {
    refresh();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });
    // A reset or a restored backup replaces fx_rates too: re-read what is stored (no network).
    const unsubscribe = onDataChanged(() => {
      getLatestReferenceRate(db).then(setRate).catch(console.error);
    });
    return () => {
      subscription.remove();
      unsubscribe();
    };
  }, [db, refresh]);

  return <FxContext.Provider value={rate}>{children}</FxContext.Provider>;
}
