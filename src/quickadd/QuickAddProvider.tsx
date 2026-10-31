import React, { createContext, useCallback, useContext, useMemo, useRef } from 'react';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { QuickAddSheet, type QuickAddOptions, type QuickAddSheetHandle } from './QuickAddSheet';

interface QuickAddContextValue {
  open: (options?: QuickAddOptions) => void;
}

const QuickAddContext = createContext<QuickAddContextValue>({ open: () => {} });

export const useQuickAdd = () => useContext(QuickAddContext);

/** One quick-add sheet for the whole app, opened from any screen. */
export function QuickAddProvider({ children }: { children: React.ReactNode }) {
  const sheetRef = useRef<QuickAddSheetHandle>(null);

  const open = useCallback((options?: QuickAddOptions) => {
    sheetRef.current?.open(options).catch(console.error);
  }, []);
  const value = useMemo(() => ({ open }), [open]);

  return (
    <QuickAddContext.Provider value={value}>
      <BottomSheetModalProvider>
        {children}
        <QuickAddSheet ref={sheetRef} />
      </BottomSheetModalProvider>
    </QuickAddContext.Provider>
  );
}
