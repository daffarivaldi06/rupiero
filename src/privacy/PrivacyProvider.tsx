import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useSQLiteContext } from 'expo-sqlite';
import {
  getHideBalances,
  getHideBalancesInWidget,
  setHideBalances,
  setHideBalancesInWidget,
} from '../db/repos/settings';
import { refreshWidgets } from '../widget/refresh';

interface PrivacyContextValue {
  /** Amounts show as "€ ••••" in every <Money>. */
  hidden: boolean;
  toggleHidden: () => void;
  /** The widget follows `hidden` when this is on. */
  hideInWidget: boolean;
  setHideInWidget: (value: boolean) => void;
}

const PrivacyContext = createContext<PrivacyContextValue>({
  hidden: false,
  toggleHidden: () => {},
  hideInWidget: false,
  setHideInWidget: () => {},
});

export const usePrivacy = () => useContext(PrivacyContext);

/**
 * The hide-balances switches, persisted in settings. Children render only once they are loaded, so
 * amounts never flash before being hidden (the splash covers the wait).
 */
export function PrivacyProvider({ children }: { children: React.ReactNode }) {
  const db = useSQLiteContext();
  const [loaded, setLoaded] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [hideInWidget, setHideInWidgetState] = useState(false);

  useEffect(() => {
    Promise.all([getHideBalances(db), getHideBalancesInWidget(db)])
      .then(([nextHidden, nextWidget]) => {
        setHidden(nextHidden);
        setHideInWidgetState(nextWidget);
      })
      .catch(console.error)
      .finally(() => setLoaded(true));
  }, [db]);

  const persist = useCallback(
    async (write: Promise<void>) => {
      try {
        await write;
        await refreshWidgets(db);
      } catch (e) {
        console.error(e);
      }
    },
    [db],
  );

  const toggleHidden = useCallback(() => {
    const next = !hidden;
    setHidden(next);
    persist(setHideBalances(db, next));
  }, [db, hidden, persist]);

  const setHideInWidget = useCallback(
    (value: boolean) => {
      setHideInWidgetState(value);
      persist(setHideBalancesInWidget(db, value));
    },
    [db, persist],
  );

  const value = useMemo(() => ({ hidden, toggleHidden, hideInWidget, setHideInWidget }), [hidden, toggleHidden, hideInWidget, setHideInWidget]);

  return <PrivacyContext.Provider value={value}>{loaded ? children : null}</PrivacyContext.Provider>;
}
