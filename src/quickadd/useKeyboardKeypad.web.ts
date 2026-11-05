import { useEffect, useRef } from 'react';
import { keyboardAction } from '../domain/keyboard';
import type { KeyboardKeypadHandlers } from './useKeyboardKeypad';

/** Typing in a text field (the note) stays normal typing, Enter and Escape included. */
function isTextField(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable || target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')
  );
}

/**
 * While `enabled` (the quick-add sheet is open), keyboard keys drive the keypad, Enter saves and
 * Escape closes. Listens on window in the capture phase and stops handled keys there: otherwise a
 * focused button (a keypad key or chip clicked with the mouse) would also react to Enter.
 */
export function useKeyboardKeypad(enabled: boolean, handlers: KeyboardKeypadHandlers): void {
  const latest = useRef(handlers);
  useEffect(() => {
    latest.current = handlers;
  });

  useEffect(() => {
    if (!enabled) return;
    // One save per opening: after a successful save the sheet is still open while it animates away,
    // and a second Enter then would save the transaction twice.
    let saving = false;
    let saved = false;

    const onKeyDown = (event: KeyboardEvent) => {
      if (saved || isTextField(event.target)) return;
      const action = keyboardAction(event);
      if (action === null) return;
      event.preventDefault();
      event.stopPropagation();

      if (action === 'close') {
        latest.current.onClose();
      } else if (action === 'save') {
        if (saving || event.repeat) return;
        saving = true;
        latest.current
          .onSave()
          .then((ok) => {
            saved = ok;
          })
          .finally(() => {
            saving = false;
          });
      } else {
        latest.current.onKey(action);
      }
    };

    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [enabled]);
}
