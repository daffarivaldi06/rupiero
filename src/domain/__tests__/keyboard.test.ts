import { pressKey } from '../calc';
import { keyboardAction } from '../keyboard';

describe('keyboardAction', () => {
  it('maps digits to keypad digits', () => {
    for (const digit of ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']) {
      expect(keyboardAction({ key: digit })).toBe(digit);
    }
  });

  it('maps both "," and "." to the decimal separator', () => {
    expect(keyboardAction({ key: ',' })).toBe(',');
    expect(keyboardAction({ key: '.' })).toBe(',');
  });

  it('maps Backspace to the keypad backspace', () => {
    expect(keyboardAction({ key: 'Backspace' })).toBe('back');
  });

  it('maps + - * / to the keypad operators', () => {
    expect(keyboardAction({ key: '+' })).toBe('+');
    expect(keyboardAction({ key: '-' })).toBe('−');
    expect(keyboardAction({ key: '*' })).toBe('×');
    expect(keyboardAction({ key: '/' })).toBe('÷');
  });

  it('maps Enter to save and Escape to close', () => {
    expect(keyboardAction({ key: 'Enter' })).toBe('save');
    expect(keyboardAction({ key: 'Escape' })).toBe('close');
  });

  it('ignores other keys', () => {
    for (const key of ['a', 'x', 'e', ' ', 'Tab', 'Delete', 'ArrowLeft', 'Shift', 'F5', '=', '10', '', 'toString']) {
      expect(keyboardAction({ key })).toBeNull();
    }
  });

  it('ignores keys pressed with Ctrl, Cmd or Alt, so browser shortcuts keep working', () => {
    expect(keyboardAction({ key: '1', ctrlKey: true })).toBeNull();
    expect(keyboardAction({ key: '+', metaKey: true })).toBeNull();
    expect(keyboardAction({ key: 'Enter', altKey: true })).toBeNull();
    expect(keyboardAction({ key: 'Backspace', ctrlKey: true })).toBeNull();
  });

  it('drives the keypad rules through pressKey', () => {
    const type = (keys: string[], currency: 'EUR' | 'IDR') =>
      keys.reduce((expression, key) => {
        const action = keyboardAction({ key });
        return action && action !== 'save' && action !== 'close' ? pressKey(expression, action, currency) : expression;
      }, '');
    expect(type(['1', '2', '.', '5', '0', '*', '3'], 'EUR')).toBe('12,50×3');
    expect(type(['1', '2', ',', '5', 'Backspace', '-', '2'], 'EUR')).toBe('12−2');
    // IDR has no decimals: the separator is ignored, as on the on-screen keypad.
    expect(type(['2', '5', '.', '0', '0', '0'], 'IDR')).toBe('25000');
  });
});
