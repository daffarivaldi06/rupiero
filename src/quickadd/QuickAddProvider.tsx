import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { QuickAddSheet, type QuickAddOptions, type QuickAddSheetHandle } from './QuickAddSheet';

interface QuickAddContextValue {
  open: (options?: QuickAddOptions) => void;
  /** Bumps after every save or delete; include it in a screen's load dependencies to refresh. */
  revision: number;
}

const QuickAddContext = createContext<QuickAddContextValue>({ open: () => {}, revision: 0 });

export const useQuickAdd = () => useContext(QuickAddContext);

/** One quick-add sheet for the whole app, opened from any screen. */
export function QuickAddProvider({ children }: { children: React.ReactNode }) {
  const sheetRef = useRef<QuickAddSheetHandle>(null);
  const [revision, setRevision] = useState(0);

  const open = useCallback((options?: QuickAddOptions) => {
    sheetRef.current?.open(options).catch(console.error);
  }, []);
  const value = useMemo(() => ({ open, revision }), [open, revision]);

  return (
    <QuickAddContext.Provider value={value}>
      <BottomSheetModalProvider>
        {children}
        <QuickAddSheet ref={sheetRef} onChanged={() => setRevision((r) => r + 1)} />
      </BottomSheetModalProvider>
    </QuickAddContext.Provider>
  );
}
