// Amounts as a screen reader should say them: "minus 12 euro 50 sen" rather than "minus euro twelve
// comma five zero". Digits stay digits; TalkBack reads them in the voice's own language.
import type { CurrencyCode } from '../domain/money';
import { getLocale, type Locale } from './locale';

interface SpokenOptions {
  sign?: boolean;
  locale?: Locale;
}

const WORDS: Record<Locale, { minus: string; plus: string; eur: [string, string]; cent: [string, string]; idr: string }> = {
  id: { minus: 'minus', plus: 'plus', eur: ['euro', 'euro'], cent: ['sen', 'sen'], idr: 'rupiah' },
  en: { minus: 'minus', plus: 'plus', eur: ['euro', 'euros'], cent: ['cent', 'cents'], idr: 'rupiah' },
};

const pick = ([one, many]: [string, string], n: number) => (n === 1 ? one : many);

export function spokenAmount(minor: number, currency: CurrencyCode, options: SpokenOptions = {}): string {
  const words = WORDS[options.locale ?? getLocale()];
  const abs = Math.abs(minor);
  const parts: string[] = [];
  if (minor < 0) parts.push(words.minus);
  else if (options.sign && minor > 0) parts.push(words.plus);

  if (currency === 'IDR') {
    parts.push(`${abs} ${words.idr}`);
  } else {
    const whole = Math.floor(abs / 100);
    const cents = abs % 100;
    if (whole > 0 || cents === 0) parts.push(`${whole} ${pick(words.eur, whole)}`);
    if (cents > 0) parts.push(`${cents} ${pick(words.cent, cents)}`);
  }
  return parts.join(' ');
}
