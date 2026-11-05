// Physical keyboard → quick-add keypad, for the web build. Pure: takes the fields of a KeyboardEvent.
import type { KeypadKey } from './calc';

export type KeyboardAction = KeypadKey | 'save' | 'close';

export interface KeyPress {
  /** KeyboardEvent.key: the character typed (layout-aware, numpad included) or a named key. */
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  altKey?: boolean;
}

const KEYS: Record<string, KeyboardAction> = {
  ',': ',',
  '.': ',',
  Backspace: 'back',
  '+': '+',
  '-': '−',
  '*': '×',
  '/': '÷',
  Enter: 'save',
  Escape: 'close',
};

/**
 * What a key press does in the quick-add sheet, or null to leave it to the browser. Shift is allowed
 * ("+" and "*" need it on many layouts); Ctrl, Cmd and Alt are not, so browser shortcuts keep working.
 */
export function keyboardAction({ key, ctrlKey, metaKey, altKey }: KeyPress): KeyboardAction | null {
  if (ctrlKey || metaKey || altKey) return null;
  if (key.length === 1 && key >= '0' && key <= '9') return key as KeypadKey;
  return Object.prototype.hasOwnProperty.call(KEYS, key) ? KEYS[key] : null;
}
