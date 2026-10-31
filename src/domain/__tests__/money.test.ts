import {
  convertMinor,
  formatInputValue,
  formatMoney,
  formatMoneyParts,
  impliedRate,
  invertRate,
  isCurrencyCode,
  parseAmount,
} from '../money';

const NBSP = ' ';

describe('formatMoney', () => {
  it.each([
    [123456, 'EUR', `€${NBSP}1.234,56`],
    [1250, 'EUR', `€${NBSP}12,50`],
    [5, 'EUR', `€${NBSP}0,05`],
    [0, 'EUR', `€${NBSP}0,00`],
    [1250000, 'IDR', `Rp${NBSP}1.250.000`],
    [999, 'IDR', `Rp${NBSP}999`],
    [0, 'IDR', `Rp${NBSP}0`],
  ] as const)('formats %d %s as %s', (minor, currency, expected) => {
    expect(formatMoney(minor, currency)).toBe(expected);
  });

  it('puts the sign before the symbol', () => {
    expect(formatMoney(-12500, 'IDR')).toBe(`-Rp${NBSP}12.500`);
    expect(formatMoney(-1, 'EUR')).toBe(`-€${NBSP}0,01`);
  });

  it('adds "+" only when asked and only for positive amounts', () => {
    expect(formatMoney(1250, 'EUR', { sign: true })).toBe(`+€${NBSP}12,50`);
    expect(formatMoney(0, 'EUR', { sign: true })).toBe(`€${NBSP}0,00`);
    expect(formatMoney(-1250, 'EUR', { sign: true })).toBe(`-€${NBSP}12,50`);
  });

  it('rejects non-integer amounts', () => {
    expect(() => formatMoney(12.5, 'EUR')).toThrow(RangeError);
    expect(() => formatMoney(Number.NaN, 'IDR')).toThrow(RangeError);
  });
});

describe('formatMoneyParts', () => {
  it('splits sign, symbol and amount', () => {
    expect(formatMoneyParts(-123456, 'EUR')).toEqual({ sign: '-', symbol: '€', amount: '1.234,56' });
    expect(formatMoneyParts(1250000, 'IDR', { sign: true })).toEqual({ sign: '+', symbol: 'Rp', amount: '1.250.000' });
    expect(formatMoneyParts(0, 'IDR', { sign: true })).toEqual({ sign: '', symbol: 'Rp', amount: '0' });
  });

  it('agrees with formatMoney', () => {
    for (const minor of [-99, 0, 5, 123456]) {
      const { sign, symbol, amount } = formatMoneyParts(minor, 'EUR', { sign: true });
      expect(`${sign}${symbol}${NBSP}${amount}`).toBe(formatMoney(minor, 'EUR', { sign: true }));
    }
  });
});

describe('parseAmount', () => {
  it.each([
    ['12,50', 1250],
    ['12.50', 1250],
    ['12,5', 1250],
    ['12', 1200],
    ['12,', 1200],
    [',5', 50],
    ['1.234,56', 123456],
    ['1,234.56', 123456],
    ['1.234', 123400],
    ['1.234.567', 123456700],
    ['12,505', 1250500], // three digits after the last separator are thousands, like "1.234"
    [' 1 234,56 ', 123456],
    ['0', 0],
  ])('EUR %p → %p', (text, expected) => {
    expect(parseAmount(text, 'EUR')).toBe(expected);
  });

  it.each([
    ['1250000', 1250000],
    ['1.250.000', 1250000],
    ['1,250,000', 1250000],
    ['35.000', 35000],
  ])('IDR %p → %p', (text, expected) => {
    expect(parseAmount(text, 'IDR')).toBe(expected);
  });

  it.each(['', ' ', '.', ',', '-5', 'abc', '12a', '1.234.56', '12.345,678', '1234,567', '0,001', '1.23.456'])(
    'EUR rejects %p',
    (text) => {
      expect(parseAmount(text, 'EUR')).toBeNull();
    },
  );

  it.each(['12,50', '12.5', '1.25.000', '-1000', '€5'])('IDR rejects %p', (text) => {
    expect(parseAmount(text, 'IDR')).toBeNull();
  });

  it('rejects amounts beyond the safe integer range', () => {
    expect(parseAmount('99999999999999999', 'IDR')).toBeNull();
  });

  it('round-trips with formatInputValue', () => {
    for (const minor of [0, 5, 1250, 123456, 100000000]) {
      expect(parseAmount(formatInputValue(minor, 'EUR'), 'EUR')).toBe(minor);
      expect(parseAmount(formatInputValue(minor, 'IDR'), 'IDR')).toBe(minor);
    }
  });
});

describe('exchange rates', () => {
  const eurToIdr = impliedRate(20000, 'EUR', 3420000, 'IDR'); // €200,00 → Rp 3.420.000

  it('converts using the captured amounts', () => {
    expect(convertMinor(100, eurToIdr)).toBe(17100); // €1 → Rp 17.100
    expect(convertMinor(1250, eurToIdr)).toBe(213750);
  });

  it('rounds half away from zero', () => {
    const rate = impliedRate(3, 'EUR', 1, 'IDR');
    expect(convertMinor(1, rate)).toBe(0); // 0.33
    expect(convertMinor(2, rate)).toBe(1); // 0.67
    const half = impliedRate(2, 'EUR', 1, 'IDR');
    expect(convertMinor(1, half)).toBe(1); // 0.5
    expect(convertMinor(-1, half)).toBe(-1);
  });

  it('inverts without losing precision', () => {
    const idrToEur = invertRate(eurToIdr);
    expect(convertMinor(1710000, idrToEur)).toBe(10000); // Rp 1.710.000 → €100,00
  });

  it('does not overflow on large amounts', () => {
    const rate = impliedRate(100, 'EUR', 17123, 'IDR');
    expect(convertMinor(1_000_000_000_00, rate)).toBe(17_123_000_000_000);
  });

  it('rejects non-positive rate amounts', () => {
    expect(() => impliedRate(0, 'EUR', 100, 'IDR')).toThrow(RangeError);
  });
});

it('recognises supported currency codes', () => {
  expect(isCurrencyCode('EUR')).toBe(true);
  expect(isCurrencyCode('USD')).toBe(false);
  expect(isCurrencyCode('toString')).toBe(false);
});
