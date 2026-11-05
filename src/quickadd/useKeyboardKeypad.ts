import type { KeypadKey } from '../domain/calc';

export interface KeyboardKeypadHandlers {
  onKey: (key: KeypadKey) => void;
  /** Resolves to true if the transaction was saved (the sheet is then closing). */
  onSave: () => Promise<boolean>;
  onClose: () => void;
}

/**
 * Physical keyboard input for the quick-add sheet. Web only (see useKeyboardKeypad.web.ts): on
 * Android the on-screen keypad is the only input, so this does nothing.
 */
export function useKeyboardKeypad(_enabled: boolean, _handlers: KeyboardKeypadHandlers): void {}
