import {
  evaluateExpression,
  expressionFromMinor,
  hasOperator,
  pressKey,
  withoutTrailingOperator,
  type KeypadKey,
} from '../calc';

describe('evaluateExpression', () => {
  it('adds EUR amounts with decimals', () => {
    expect(evaluateExpression('12,5+3,2', 'EUR')).toBe(1570);
    expect(evaluateExpression('12,50', 'EUR')).toBe(1250);
    expect(evaluateExpression('12,', 'EUR')).toBe(1200);
    expect(evaluateExpression('0,05', 'EUR')).toBe(5);
  });

  it('multiplies an amount by a factor', () => {
    expect(evaluateExpression('10000×3', 'IDR')).toBe(30000);
    expect(evaluateExpression('2,5×3', 'EUR')).toBe(750);
    expect(evaluateExpression('12×1,5', 'EUR')).toBe(1800);
    expect(evaluateExpression('3×10000', 'IDR')).toBe(30000);
  });

  it('rounds divisions half-up', () => {
    expect(evaluateExpression('10÷3', 'EUR')).toBe(333); // 3,333…
    expect(evaluateExpression('20÷3', 'EUR')).toBe(667); // 6,666…
    expect(evaluateExpression('0,05÷2', 'EUR')).toBe(3); // 0,025 → 0,03
    expect(evaluateExpression('25000÷4', 'IDR')).toBe(6250);
    expect(evaluateExpression('10000÷3', 'IDR')).toBe(3333);
    expect(evaluateExpression('5÷2', 'IDR')).toBe(3); // 2,5 → 3
  });

  it('applies × and ÷ before + and −', () => {
    expect(evaluateExpression('100+2×3', 'IDR')).toBe(106);
    expect(evaluateExpression('100−20÷4', 'IDR')).toBe(95);
    expect(evaluateExpression('10÷4×2', 'EUR')).toBe(500);
    expect(evaluateExpression('5−10', 'EUR')).toBe(-500);
  });

  it('accepts ASCII operators too', () => {
    expect(evaluateExpression('12,5 + 3,2', 'EUR')).toBe(1570);
    expect(evaluateExpression('10*3-5/5', 'IDR')).toBe(29);
  });

  it('rejects malformed expressions', () => {
    for (const bad of ['', '+5', '5+', '5++3', '5÷0', '5×', '1,234', '12,5,3', 'abc', '1.5', '−5']) {
      expect(evaluateExpression(bad, 'EUR')).toBeNull();
    }
    expect(evaluateExpression('1,5', 'IDR')).toBeNull(); // no decimals in rupiah
  });

  it('rejects results beyond the safe integer range', () => {
    expect(evaluateExpression('90071992547409×1000', 'EUR')).toBeNull();
    expect(evaluateExpression('9007199254740991', 'IDR')).toBe(9007199254740991);
  });
});

describe('helpers', () => {
  it('detects calculations and trims a half-typed operator', () => {
    expect(hasOperator('12,5')).toBe(false);
    expect(hasOperator('12,5+3')).toBe(true);
    expect(withoutTrailingOperator('12+')).toBe('12');
    expect(withoutTrailingOperator('12,')).toBe('12');
    expect(withoutTrailingOperator('12+3')).toBe('12+3');
  });
});

describe('pressKey', () => {
  const type = (keys: KeypadKey[], currency: 'EUR' | 'IDR' = 'EUR') =>
    keys.reduce((expression, key) => pressKey(expression, key, currency), '');

  it('builds a calculation key by key', () => {
    expect(type(['1', '2', ',', '5', '+', '3', ',', '2'])).toBe('12,5+3,2');
    expect(type(['1', '0', '000', '×', '3'], 'IDR')).toBe('10000×3');
  });

  it('starts decimals with 0 and caps them at the currency’s minor digits', () => {
    expect(type([',', '5'])).toBe('0,5');
    expect(type(['1', ',', '2', '3', '4'])).toBe('1,23');
    expect(type(['1', ',', ','])).toBe('1,');
    expect(type(['1', ','], 'IDR')).toBe('1');
  });

  it('never starts with or doubles an operator', () => {
    expect(type(['+'])).toBe('');
    expect(type(['5', '+', '−', '×'])).toBe('5×');
    expect(type(['5', ',', '+'])).toBe('5+');
  });

  it('drops leading zeros and only adds 000 after a real number', () => {
    expect(type(['0', '0', '7'])).toBe('7');
    expect(type(['000'], 'IDR')).toBe('');
    expect(type(['0', '000'], 'IDR')).toBe('0');
    expect(type(['5', '+', '000'], 'IDR')).toBe('5+');
    expect(type(['1', ',', '5', '000'])).toBe('1,5');
  });

  it('deletes one character at a time', () => {
    expect(type(['1', '2', '+', 'back'])).toBe('12');
    expect(type(['back'])).toBe('');
  });

  it('stops growing at a sane length', () => {
    const many = Array.from({ length: 40 }, () => '9' as const);
    expect(type(many, 'IDR')).toHaveLength(32);
  });
});

describe('expressionFromMinor', () => {
  it('turns stored amounts back into keypad text that evaluates to the same value', () => {
    expect(expressionFromMinor(1570, 'EUR')).toBe('15,70');
    expect(expressionFromMinor(1500, 'EUR')).toBe('15');
    expect(expressionFromMinor(5, 'EUR')).toBe('0,05');
    expect(expressionFromMinor(25_000, 'IDR')).toBe('25000');
    for (const [minor, currency] of [[1570, 'EUR'], [5, 'EUR'], [25_000, 'IDR']] as const) {
      expect(evaluateExpression(expressionFromMinor(minor, currency), currency)).toBe(minor);
    }
  });
});
