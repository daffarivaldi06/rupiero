import {
  convertWithReference,
  differenceBasisPoints,
  eurToIdr,
  parseRateMicro,
  rateFor,
  rateMicroOf,
} from '../fx';
import { convertMinor, impliedRate } from '../money';

// ECB reference rate of 30 Oct 2026: 1 EUR = 20.275,17 IDR.
const ECB = 20_275_170_000;

describe('EUR/IDR conversion with BigInt', () => {
  it('converts €100.000,00 without overflowing the intermediate product', () => {
    // 10^7 cents × 20275170000 ≈ 2 × 10^17 > Number.MAX_SAFE_INTEGER.
    expect(convertWithReference(10_000_000, 'EUR', 'IDR', ECB)).toBe(2_027_517_000);
  });

  it('converts Rp 10.000.000.000 with the derived IDR→EUR rate', () => {
    // 10^10 × 10^8 = 10^18 before dividing.
    expect(convertWithReference(10_000_000_000, 'IDR', 'EUR', ECB)).toBe(49_321_411); // € 493.214,11
  });

  it('keeps every unit that float arithmetic would lose', () => {
    expect(convertWithReference(900_719_926_176, 'EUR', 'IDR', ECB)).toBe(182_622_496_256_058);
    expect(Math.round((900_719_926_176 * ECB) / 1e8)).toBe(182_622_496_256_059); // the float answer is off by one
  });

  it('rounds half-up exactly at ,5 and symmetrically for negatives', () => {
    const half = 50 * 1_000_000; // rate_micro for 1 EUR = 50 IDR, so 1 cent = 0.5 IDR
    expect(convertWithReference(1, 'EUR', 'IDR', half)).toBe(1);
    expect(convertWithReference(-1, 'EUR', 'IDR', half)).toBe(-1);
    expect(convertWithReference(3, 'EUR', 'IDR', half)).toBe(2); // 1.5 → 2
    const justBelow = half - 1;
    expect(convertWithReference(1, 'EUR', 'IDR', justBelow)).toBe(0); // 0.49999999 → 0
  });

  it('refuses results beyond the safe integer range instead of returning a wrong number', () => {
    expect(() => convertWithReference(Number.MAX_SAFE_INTEGER, 'EUR', 'IDR', ECB)).toThrow(RangeError);
    expect(() => convertWithReference(0.5, 'EUR', 'IDR', ECB)).toThrow(RangeError);
  });

  it('round-trips within one minor unit', () => {
    for (const cents of [1, 99, 1250, 123_456, 10_000_000, 987_654_321]) {
      const idr = convertWithReference(cents, 'EUR', 'IDR', ECB);
      const back = convertWithReference(idr, 'IDR', 'EUR', ECB);
      expect(Math.abs(back - cents)).toBeLessThanOrEqual(1);
    }
    for (const rupiah of [1, 500, 25_000, 1_250_000, 10_000_000_000]) {
      const cents = convertWithReference(rupiah, 'IDR', 'EUR', ECB);
      const back = convertWithReference(cents, 'EUR', 'IDR', ECB);
      // One cent is worth ~Rp 203, so the IDR side can only come back to the nearest cent.
      expect(Math.abs(back - rupiah)).toBeLessThanOrEqual(Math.ceil(ECB / 1e8 / 2));
    }
  });

  it('builds the stored rate as integers and derives the inverse', () => {
    expect(eurToIdr(ECB)).toEqual({ from: 'EUR', to: 'IDR', fromMinor: 100_000_000, toMinor: ECB });
    expect(rateFor('IDR', 'EUR', ECB)).toEqual({ from: 'IDR', to: 'EUR', fromMinor: ECB, toMinor: 100_000_000 });
    expect(convertWithReference(1234, 'EUR', 'EUR', ECB)).toBe(1234);
    expect(() => eurToIdr(0)).toThrow(RangeError);
  });
});

describe('actual vs reference rate', () => {
  it('expresses a transfer as IDR per EUR × 10^6 in either direction', () => {
    const sent = impliedRate(20000, 'EUR', 3_420_000, 'IDR'); // €200 → Rp 3.420.000
    expect(rateMicroOf(sent)).toBe(17_100_000_000);
    expect(rateMicroOf(impliedRate(3_420_000, 'IDR', 20000, 'EUR'))).toBe(17_100_000_000);
    expect(rateMicroOf(eurToIdr(ECB))).toBe(ECB);
    expect(convertMinor(100, sent)).toBe(17100);
  });

  it('measures the difference in basis points', () => {
    expect(differenceBasisPoints(17_100_000_000, ECB)).toBe(-1566); // 15,66 % below ECB
    expect(differenceBasisPoints(ECB, ECB)).toBe(0);
    expect(differenceBasisPoints(20_477_921_700, ECB)).toBe(100); // +1 %
  });
});

describe('parseRateMicro', () => {
  it('reads API numbers through their decimal text', () => {
    expect(parseRateMicro(20275.17)).toBe(ECB);
    expect(parseRateMicro('20275.17')).toBe(ECB);
    expect(parseRateMicro(17100)).toBe(17_100_000_000);
    expect(parseRateMicro('0.1234565')).toBe(123_457); // 7th decimal rounds half-up
    expect(parseRateMicro('0.1234564')).toBe(123_456);
  });

  it('rejects anything that is not a positive plain decimal', () => {
    for (const bad of [0, -1, NaN, Infinity, 1e-7, '', 'abc', '1,5', '-3', '0.0000001']) {
      expect(() => parseRateMicro(bad as number | string)).toThrow(RangeError);
    }
  });
});
