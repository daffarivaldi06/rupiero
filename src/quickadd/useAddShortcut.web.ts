import { useEffect, useRef } from 'react';
import { isAddShortcut } from '../domain/keyboard';
import { isTextField } from './textField';

/**
 * Web, every width: N opens quick-add while `enabled` (quick-add is closed). Typing an "n" into a
 * text field stays typing, and Ctrl/Cmd/Alt+N stay the browser's.
 */
export function useAddShortcut(enabled: boolean, onAdd: () => void): void {
  const latest = useRef(onAdd);
  useEffect(() => {
    latest.current = onAdd;
  });

  useEffect(() => {
    if (!enabled) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat || isTextField(event.target) || !isAddShortcut(event)) return;
      event.preventDefault();
      latest.current();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [enabled]);
}
