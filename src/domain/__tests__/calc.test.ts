import { evaluateExpression, hasOperator, withoutTrailingOperator } from '../calc';

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
