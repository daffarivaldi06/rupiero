import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef } from 'react';
import { Linking } from 'react-native';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { parseQuickAddLink } from '../linking/quickAddLink';
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

  // rupiero://add?account=… (the widget's "+ EUR"/"+ IDR"), on cold start and while running.
  useEffect(() => {
    const handle = (url: string | null) => {
      const link = url ? parseQuickAddLink(url) : null;
      if (link) open(link);
    };
    Linking.getInitialURL().then(handle).catch(console.error);
    const subscription = Linking.addEventListener('url', ({ url }) => handle(url));
    return () => subscription.remove();
  }, [open]);

  return (
    <QuickAddContext.Provider value={value}>
      <BottomSheetModalProvider>
        {children}
        <QuickAddSheet ref={sheetRef} />
      </BottomSheetModalProvider>
    </QuickAddContext.Provider>
  );
}
