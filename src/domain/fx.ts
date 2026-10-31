// EUR↔IDR rates. Only EUR→IDR reference rates are stored (fx_rates.rate_micro: IDR per EUR × 10^6);
// IDR→EUR is always derived from the same row, so the two directions can never disagree.
import type { LocalDate } from './dates';
import { CURRENCIES, convertMinor, invertRate, type CurrencyCode, type ExchangeRate } from './money';

export const RATE_SCALE = 1_000_000;
const EUR_MINOR_PER_UNIT = 10 ** CURRENCIES.EUR.minorDigits; // 100 cents
const IDR_MINOR_PER_UNIT = 10 ** CURRENCIES.IDR.minorDigits; // 1 rupiah

/** A stored ECB reference rate: 1 EUR = rateMicro / 1.000.000 IDR on `date`. */
export interface ReferenceRate {
  date: LocalDate;
  rateMicro: number;
}

/** The stored rate as an exact integer ratio of minor units: 100 × 10^6 cents ↔ rateMicro × 1 rupiah. */
export function eurToIdr(rateMicro: number): ExchangeRate {
  if (!Number.isSafeInteger(rateMicro) || rateMicro <= 0) throw new RangeError(`Invalid rate_micro: ${rateMicro}`);
  return {
    from: 'EUR',
    to: 'IDR',
    fromMinor: EUR_MINOR_PER_UNIT * RATE_SCALE,
    toMinor: rateMicro * IDR_MINOR_PER_UNIT,
  };
}

/** The rate for converting `from` into `to`, derived from the EUR→IDR reference. */
export function rateFor(from: CurrencyCode, to: CurrencyCode, rateMicro: number): ExchangeRate {
  if (from === to) return { from, to, fromMinor: 1, toMinor: 1 };
  const rate = eurToIdr(rateMicro);
  return from === 'EUR' ? rate : invertRate(rate);
}

/** Converts between EUR and IDR with the reference rate (BigInt inside, see convertMinor). */
export function convertWithReference(minor: number, from: CurrencyCode, to: CurrencyCode, rateMicro: number): number {
  return convertMinor(minor, rateFor(from, to, rateMicro));
}

/**
 * IDR per EUR × 10^6 for any EUR↔IDR rate (e.g. one implied by a transfer), half-up. Lets an actual
 * rate be compared with the ECB reference at full precision.
 */
export function rateMicroOf(rate: ExchangeRate): number {
  const eurIdr = rate.from === 'EUR' ? rate : invertRate(rate);
  if (eurIdr.from !== 'EUR' || eurIdr.to !== 'IDR') throw new RangeError(`Not an EUR/IDR rate: ${rate.from}→${rate.to}`);
  return convertMinor(EUR_MINOR_PER_UNIT * RATE_SCALE, eurIdr) / IDR_MINOR_PER_UNIT;
}

/** Signed difference of `actualMicro` from `referenceMicro` in basis points (1/100 %), half-up. */
export function differenceBasisPoints(actualMicro: number, referenceMicro: number): number {
  return convertMinor(actualMicro - referenceMicro, { from: 'EUR', to: 'EUR', fromMinor: referenceMicro, toMinor: 10_000 });
}

/**
 * Parses an API rate such as 20275.17 into rate_micro (20275170000) from its decimal text, so no
 * float multiplication is involved. More than 6 decimals are rounded half-up.
 */
export function parseRateMicro(rate: number | string): number {
  const text = typeof rate === 'number' ? numberToPlainString(rate) : rate.trim();
  const match = /^(\d+)(?:\.(\d+))?$/.exec(text);
  if (!match) throw new RangeError(`Invalid rate: ${rate}`);
  const [, whole, fraction = ''] = match;
  const kept = (fraction + '000000').slice(0, 6);
  let micro = BigInt(whole) * BigInt(RATE_SCALE) + BigInt(kept);
  if (fraction.length > 6 && Number(fraction[6]) >= 5) micro += 1n;
  if (micro <= 0n || micro > BigInt(Number.MAX_SAFE_INTEGER)) throw new RangeError(`Rate out of range: ${rate}`);
  return Number(micro);
}

function numberToPlainString(value: number): string {
  if (!Number.isFinite(value) || value <= 0) throw new RangeError(`Invalid rate: ${value}`);
  const text = String(value);
  // Exponent forms (1e-7, 1e21) never occur for EUR→IDR; reject rather than guess.
  if (/e/i.test(text)) throw new RangeError(`Rate in exponent form is not supported: ${text}`);
  return text;
}

/**
 * All balances converted into `base` with the reference rate and added up: the "≈ total" line.
 * Each conversion rounds once; null if any amount is too large to convert safely.
 */
export function combinedTotal(
  balances: { currency: CurrencyCode; balanceMinor: number }[],
  base: CurrencyCode,
  rateMicro: number,
): number | null {
  try {
    const total = balances.reduce((sum, b) => sum + convertWithReference(b.balanceMinor, b.currency, base, rateMicro), 0);
    return Number.isSafeInteger(total) ? total : null;
  } catch {
    return null;
  }
}
