// Money is always an integer count of the currency's minor unit (EUR cents, whole rupiah).
// Formatting is done by hand instead of Intl so output is identical on Hermes and Node.

export type CurrencyCode = 'IDR' | 'EUR';

export interface CurrencyInfo {
  code: CurrencyCode;
  symbol: string;
  minorDigits: number;
}

export const CURRENCIES: Record<CurrencyCode, CurrencyInfo> = {
  IDR: { code: 'IDR', symbol: 'Rp', minorDigits: 0 },
  EUR: { code: 'EUR', symbol: '€', minorDigits: 2 },
};

export const CURRENCY_CODES = Object.keys(CURRENCIES) as CurrencyCode[];

export function isCurrencyCode(value: unknown): value is CurrencyCode {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(CURRENCIES, value);
}

const THOUSANDS = '.';
const DECIMAL = ',';
const NBSP = ' ';

function groupThousands(digits: string): string {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, THOUSANDS);
}

/** Formats the absolute value without symbol, e.g. 123456 EUR → "1.234,56". */
function formatAbsolute(minor: number, currency: CurrencyCode): string {
  const { minorDigits } = CURRENCIES[currency];
  const digits = Math.abs(minor).toString().padStart(minorDigits + 1, '0');
  const whole = digits.slice(0, digits.length - minorDigits);
  const fraction = digits.slice(digits.length - minorDigits);
  return minorDigits > 0 ? `${groupThousands(whole)}${DECIMAL}${fraction}` : groupThousands(whole);
}

export interface FormatMoneyOptions {
  /** Prefix positive amounts with "+" (negative amounts always get "-"). */
  sign?: boolean;
}

export interface MoneyParts {
  sign: '' | '-' | '+';
  symbol: string;
  /** Absolute value with grouping and decimals, e.g. "1.234,56". */
  amount: string;
}

/** The pieces of a formatted amount, for UIs that style them separately. */
export function formatMoneyParts(minor: number, currency: CurrencyCode, options: FormatMoneyOptions = {}): MoneyParts {
  assertMinor(minor);
  return {
    sign: minor < 0 ? '-' : options.sign && minor > 0 ? '+' : '',
    symbol: CURRENCIES[currency].symbol,
    amount: formatAbsolute(minor, currency),
  };
}

/** What hidden amounts show instead of digits. */
export const MASK = '••••';
export const HIDDEN_LABEL = 'Saldo disembunyikan';

export interface MoneyDisplay extends MoneyParts {
  /** For screen readers; set only when the amount is hidden. */
  accessibilityLabel?: string;
}

/**
 * How an amount is shown: formatted, or — with `hidden` — as "€ ••••" with no sign, so neither the
 * value nor its direction leaks, and a spoken "Saldo disembunyikan".
 */
export function moneyDisplay(
  minor: number,
  currency: CurrencyCode,
  options: FormatMoneyOptions & { hidden?: boolean } = {},
): MoneyDisplay {
  if (options.hidden) {
    return { sign: '', symbol: CURRENCIES[currency].symbol, amount: MASK, accessibilityLabel: HIDDEN_LABEL };
  }
  return formatMoneyParts(minor, currency, options);
}

/** moneyDisplay as one string, e.g. for the widget. */
export function formatMoneyDisplay(minor: number, currency: CurrencyCode, options: FormatMoneyOptions & { hidden?: boolean } = {}): string {
  const { sign, symbol, amount } = moneyDisplay(minor, currency, options);
  return `${sign}${symbol}${NBSP}${amount}`;
}

/** 123456 EUR → "€ 1.234,56", -12500 IDR → "-Rp 12.500". */
export function formatMoney(minor: number, currency: CurrencyCode, options: FormatMoneyOptions = {}): string {
  const { sign, symbol, amount } = formatMoneyParts(minor, currency, options);
  return `${sign}${symbol}${NBSP}${amount}`;
}

/** Value to prefill an amount field with, e.g. 1250 EUR → "12,50". Parses back with parseAmount. */
export function formatInputValue(minor: number, currency: CurrencyCode): string {
  assertMinor(minor);
  return formatAbsolute(minor, currency);
}

function isValidGrouping(integerPart: string, separator: string): boolean {
  const groups = integerPart.split(separator);
  return /^[1-9]\d{0,2}$/.test(groups[0]) && groups.slice(1).every((g) => /^\d{3}$/.test(g));
}

/**
 * Parses user input into minor units, or null when it is not a valid non-negative amount.
 * Accepts "12,50", "12.50", "1.234,56", "1,234.56" and "1234". For IDR every "." or "," is a
 * thousands separator, so "12,50" is rejected rather than read as 1250.
 */
export function parseAmount(text: string, currency: CurrencyCode): number | null {
  const input = text.replace(/[\s ]/g, '');
  if (!/^[\d.,]+$/.test(input) || !/\d/.test(input)) return null;

  const { minorDigits } = CURRENCIES[currency];
  let integerPart = input;
  let fractionPart = '';

  const lastSep = Math.max(input.lastIndexOf('.'), input.lastIndexOf(','));
  if (lastSep >= 0 && minorDigits > 0) {
    const after = input.slice(lastSep + 1);
    // Exactly three digits after the last separator reads as thousands ("1.234").
    if (after.length !== 3 || !/^\d+$/.test(after)) {
      if (after.length > minorDigits || !/^\d*$/.test(after)) return null;
      integerPart = input.slice(0, lastSep);
      fractionPart = after;
      if (integerPart.includes(input[lastSep])) return null;
    }
  }

  if (integerPart === '') integerPart = '0';
  if (/[.,]/.test(integerPart)) {
    const separators = new Set(integerPart.replace(/\d/g, ''));
    if (separators.size !== 1) return null;
    const [separator] = separators;
    if (!isValidGrouping(integerPart, separator)) return null;
    integerPart = integerPart.split(separator).join('');
  }

  const minor = Number(integerPart + fractionPart.padEnd(minorDigits, '0'));
  return Number.isSafeInteger(minor) ? minor : null;
}

function assertMinor(minor: number) {
  if (!Number.isSafeInteger(minor)) {
    throw new RangeError(`Money amounts must be safe integers in minor units, got ${minor}`);
  }
}

/**
 * An exchange rate captured from a real conversion: `fromMinor` of `from` bought `toMinor` of `to`.
 * Kept as the two integer amounts so no rounded float is ever stored.
 */
export interface ExchangeRate {
  from: CurrencyCode;
  to: CurrencyCode;
  fromMinor: number;
  toMinor: number;
}

export function impliedRate(
  fromMinor: number,
  from: CurrencyCode,
  toMinor: number,
  to: CurrencyCode,
): ExchangeRate {
  assertMinor(fromMinor);
  assertMinor(toMinor);
  if (fromMinor <= 0 || toMinor <= 0) throw new RangeError('Exchange rate amounts must be positive');
  return { from, to, fromMinor, toMinor };
}

export function invertRate(rate: ExchangeRate): ExchangeRate {
  return { from: rate.to, to: rate.from, fromMinor: rate.toMinor, toMinor: rate.fromMinor };
}

const MAX_SAFE = BigInt(Number.MAX_SAFE_INTEGER);

/**
 * Converts `minor` of `rate.from` into `rate.to`. All arithmetic is BigInt with a single rounding
 * (half away from zero) at the end, so intermediate products may exceed 2^53 without losing a unit.
 * Throws a RangeError when the result itself is not a safe integer.
 */
export function convertMinor(minor: number, rate: ExchangeRate): number {
  assertMinor(minor);
  const numerator = BigInt(Math.abs(minor)) * BigInt(rate.toMinor);
  const denominator = BigInt(rate.fromMinor);
  const rounded = (numerator * 2n + denominator) / (denominator * 2n);
  if (rounded > MAX_SAFE) {
    throw new RangeError(`Converted amount ${rounded} ${rate.to} is beyond the safe integer range`);
  }
  return minor < 0 ? -Number(rounded) : Number(rounded);
}
