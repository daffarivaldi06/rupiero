import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Txt } from '../components/Txt';
import { useThemedStyles, type Theme } from '../theme/ThemeProvider';

export interface ToastOptions {
  /** One action, e.g. "Undo". The toast closes when it is pressed. */
  action?: { label: string; onPress: () => void };
  tone?: 'default' | 'error';
}

interface Toast extends ToastOptions {
  id: number;
  message: string;
}

interface ToastContextValue {
  show: (message: string, options?: ToastOptions) => void;
}

const ToastContext = createContext<ToastContextValue>({ show: () => {} });

/** Short confirmations ("Transaction deleted · Undo") instead of alert dialogs. */
export const useToast = () => useContext(ToastContext);

const DURATION_MS = 4000;
const ACTION_DURATION_MS = 6000;
// TalkBack users need time to reach the action after it is announced.
const SCREEN_READER_DURATION_MS = 12000;
// Above the dashboard's add button (64 dp + its 16 dp margin) so it never covers it.
const BOTTOM_OFFSET = 96;

/** One toast at a time, at the bottom; a new one replaces the current one. */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const styles = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<Toast | null>(null);
  const nextId = useRef(0);
  const screenReader = useRef(false);

  useEffect(() => {
    AccessibilityInfo.isScreenReaderEnabled().then((on) => (screenReader.current = on)).catch(() => {});
    const subscription = AccessibilityInfo.addEventListener('screenReaderChanged', (on) => (screenReader.current = on));
    return () => subscription.remove();
  }, []);

  const show = useCallback((message: string, options: ToastOptions = {}) => {
    nextId.current += 1;
    setToast({ id: nextId.current, message, ...options });
    AccessibilityInfo.announceForAccessibility(options.action ? `${message}. ${options.action.label}` : message);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const duration = screenReader.current ? SCREEN_READER_DURATION_MS : toast.action ? ACTION_DURATION_MS : DURATION_MS;
    const timer = setTimeout(() => setToast((current) => (current?.id === toast.id ? null : current)), duration);
    return () => clearTimeout(timer);
  }, [toast]);

  const value = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toast && (
        <View pointerEvents="box-none" style={[styles.host, { bottom: insets.bottom + BOTTOM_OFFSET }]}>
          <Animated.View
            key={toast.id}
            entering={FadeInDown.duration(160)}
            exiting={FadeOutDown.duration(160)}
            style={[styles.toast, toast.tone === 'error' && styles.error]}
            accessibilityLiveRegion="polite"
          >
            <Txt tone={toast.tone === 'error' ? 'onExpense' : 'onInk'} style={styles.message}>
              {toast.message}
            </Txt>
            {toast.action && (
              <Pressable
                onPress={() => {
                  toast.action!.onPress();
                  setToast(null);
                }}
                style={styles.action}
                hitSlop={8}
                accessibilityRole="button"
              >
                <Txt variant="bodyStrong" tone={toast.tone === 'error' ? 'onExpense' : 'onInk'} style={styles.actionText}>
                  {toast.action.label}
                </Txt>
              </Pressable>
            )}
          </Animated.View>
        </View>
      )}
    </ToastContext.Provider>
  );
}

const makeStyles = ({ color, radius, space }: Theme) =>
  StyleSheet.create({
    host: {
      position: 'absolute',
      left: 0,
      right: 0,
      alignItems: 'center',
      paddingHorizontal: space.lg,
    },
    toast: {
      width: '100%',
      maxWidth: 560,
      minHeight: 48,
      flexDirection: 'row',
      alignItems: 'center',
      paddingLeft: space.lg,
      paddingRight: space.sm,
      paddingVertical: space.sm,
      borderRadius: radius.sm,
      backgroundColor: color.ink,
    },
    error: {
      backgroundColor: color.expense,
    },
    message: {
      flex: 1,
    },
    action: {
      minHeight: 40,
      justifyContent: 'center',
      paddingHorizontal: space.md,
    },
    actionText: {
      textDecorationLine: 'underline',
    },
  });
