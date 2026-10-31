// Keypad calculator: "12,5+3,2" or "10000×3" straight to minor units, with integer arithmetic only.
// The first number of each term is an amount of money; numbers after × or ÷ are plain factors.
// Each term is kept as an exact fraction and rounded half-up once, then the terms are added.
import { CURRENCIES, type CurrencyCode } from './money';

export const OPERATORS = ['+', '−', '×', '÷'] as const;
export type Operator = (typeof OPERATORS)[number];

const ALIASES: Record<string, Operator> = { '+': '+', '-': '−', '−': '−', '*': '×', '×': '×', '/': '÷', '÷': '÷' };
const MAX_SAFE = BigInt(Number.MAX_SAFE_INTEGER);

interface Fraction {
  num: bigint;
  den: bigint;
}

/** Splits into numbers and operators; null if the text has anything else. */
function tokenize(expression: string): (string | Operator)[] | null {
  const tokens: (string | Operator)[] = [];
  let number = '';
  for (const char of expression.replace(/\s+/g, '')) {
    if ((char >= '0' && char <= '9') || char === ',') {
      number += char;
    } else if (char in ALIASES) {
      tokens.push(number, ALIASES[char]);
      number = '';
    } else {
      return null;
    }
  }
  tokens.push(number);
  return tokens;
}

/** "12,5" → 125/10. Decimals only where the currency has minor digits, at most that many. */
function parseNumber(text: string, currency: CurrencyCode): Fraction | null {
  const digits = CURRENCIES[currency].minorDigits;
  const match = /^(\d+)(?:,(\d*))?$/.exec(text);
  if (!match) return null;
  const [, whole, fraction] = match;
  if (fraction !== undefined && fraction.length > digits) return null;
  const decimals = fraction ?? '';
  return { num: BigInt(whole + decimals), den: 10n ** BigInt(decimals.length) };
}

const roundHalfUp = ({ num, den }: Fraction): bigint => {
  const negative = num < 0n !== den < 0n;
  const n = num < 0n ? -num : num;
  const d = den < 0n ? -den : den;
  const rounded = (n * 2n + d) / (d * 2n);
  return negative ? -rounded : rounded;
};

/**
 * Evaluates a keypad expression in `currency`'s minor units. × and ÷ bind tighter than + and −.
 * Returns null for anything malformed (empty operands, too many decimals, division by zero) or a
 * result outside the safe integer range. The result may be zero or negative; callers decide.
 */
export function evaluateExpression(expression: string, currency: CurrencyCode): number | null {
  const tokens = tokenize(expression);
  if (!tokens) return null;
  const minorPerUnit = 10n ** BigInt(CURRENCIES[currency].minorDigits);

  let total = 0n;
  let term: Fraction | null = null;
  let sign = 1n;
  let pending: Operator | null = null;

  for (let i = 0; i < tokens.length; i += 2) {
    const value = parseNumber(tokens[i] as string, currency);
    if (!value) return null;
    if (term === null) {
      // An amount: whole units → minor units.
      term = { num: value.num * minorPerUnit * sign, den: value.den };
    } else if (pending === '×') {
      term = { num: term.num * value.num, den: term.den * value.den };
    } else {
      if (value.num === 0n) return null;
      term = { num: term.num * value.den, den: term.den * value.num };
    }

    const operator = tokens[i + 1] as Operator | undefined;
    if (operator === '+' || operator === '−' || operator === undefined) {
      total += roundHalfUp(term);
      term = null;
      sign = operator === '−' ? -1n : 1n;
    }
    pending = operator ?? null;
  }

  if (total > MAX_SAFE || total < -MAX_SAFE) return null;
  return Number(total);
}

/** True if the expression has an operator, i.e. it is a calculation rather than a plain amount. */
export const hasOperator = (expression: string) => /[+\-−×÷*/]/.test(expression);

/** Drops a trailing operator or separator so a half-typed expression ("12+") can be previewed. */
export const withoutTrailingOperator = (expression: string) => expression.replace(/[+\-−×÷*/,]+$/, '');

export type KeypadKey = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '000' | ',' | Operator | 'back';

const MAX_EXPRESSION_LENGTH = 32;
const isOperator = (char: string | undefined): char is Operator => !!char && (OPERATORS as readonly string[]).includes(char);

/**
 * The expression after pressing `key`, following keypad rules: no leading or doubled operator (a new
 * operator replaces the previous one), a decimal separator only where the currency has minor units
 * and at most that many decimals, no leading zeros, "000" only after a non-zero whole number.
 */
export function pressKey(expression: string, key: KeypadKey, currency: CurrencyCode): string {
  if (key === 'back') return expression.slice(0, -1);

  const lastOperator = Math.max(...OPERATORS.map((op) => expression.lastIndexOf(op)));
  const head = expression.slice(0, lastOperator + 1);
  const number = expression.slice(lastOperator + 1);
  const digits = CURRENCIES[currency].minorDigits;
  const [whole, fraction] = number.split(',');

  if (isOperator(key)) {
    if (expression === '') return expression;
    const trimmed = expression.replace(/,$/, '');
    return isOperator(trimmed.at(-1)) ? trimmed.slice(0, -1) + key : trimmed + key;
  }

  let next: string;
  if (key === ',') {
    if (digits === 0 || fraction !== undefined) return expression;
    next = head + (whole === '' ? '0,' : `${whole},`);
  } else if (key === '000') {
    if (whole === '' || whole === '0' || fraction !== undefined) return expression;
    next = expression + '000';
  } else {
    if (fraction !== undefined) {
      if (fraction.length >= digits) return expression;
      next = expression + key;
    } else {
      next = head + (whole === '0' ? key : whole + key);
    }
  }
  return next.length > MAX_EXPRESSION_LENGTH ? expression : next;
}

/** A stored amount as keypad text, for editing: 1570 EUR → "15,70", 25000 IDR → "25000". */
export function expressionFromMinor(minor: number, currency: CurrencyCode): string {
  const digits = CURRENCIES[currency].minorDigits;
  if (digits === 0) return String(minor);
  const unit = 10 ** digits;
  const whole = Math.trunc(minor / unit);
  const fraction = minor % unit;
  return fraction === 0 ? String(whole) : `${whole},${String(fraction).padStart(digits, '0')}`;
}
