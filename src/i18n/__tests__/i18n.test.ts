import { formatInputValue, formatMoney, formatMoneyDisplay, moneyDisplay, parseAmount } from '../../domain/money';
import { DICTIONARIES, splitMessage, t } from '../index';
import { getLocale, resolveLocale, setLocale } from '../locale';
import { en } from '../messages/en';
import { id } from '../messages/id';
import { spokenAmount } from '../spoken';

const NBSP = '\u00A0';

function leaves(node: object, prefix = ''): [string, string][] {
  return Object.entries(node).flatMap(([key, value]) =>
    typeof value === 'string' ? [[prefix + key, value] as [string, string]] : leaves(value, `${prefix}${key}.`),
  );
}

const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

afterEach(() => setLocale('id'));

describe('dictionaries', () => {
  it('have the same keys and placeholders in both languages', () => {
    const idLeaves = leaves(id);
    const enLeaves = new Map(leaves(en));
    expect([...enLeaves.keys()].sort()).toEqual(idLeaves.map(([key]) => key).sort());
    for (const [key, text] of idLeaves) {
      expect({ key, placeholders: placeholders(enLeaves.get(key)!) }).toEqual({ key, placeholders: placeholders(text) });
    }
  });

  it('have no empty messages', () => {
    for (const dictionary of Object.values(DICTIONARIES)) {
      for (const [key, text] of leaves(dictionary)) expect({ key, empty: text.trim() === '' }).toEqual({ key, empty: false });
    }
  });
});

describe('t', () => {
  it('translates in the active language and fills placeholders', () => {
    expect(t('budget.copyFrom', { month: 'Oktober' })).toBe('Salin dari Oktober');
    setLocale('en');
    expect(t('budget.copyFrom', { month: 'October' })).toBe('Copy from October');
    expect(t('chart.other', { count: 3 })).toBe('Other (3)');
  });

  it('can translate in a given language without switching', () => {
    expect(t('common.save', undefined, 'en')).toBe('Save');
    expect(getLocale()).toBe('id');
  });

  it('splits a message around its placeholders, keeping word order', () => {
    expect(splitMessage('budgetBar.of', 'id')).toEqual(['', 'spent', ' dari ', 'limit', '']);
    expect(splitMessage('budgetBar.left', 'en')).toEqual(['', 'amount', ' left']);
  });
});

describe('resolveLocale', () => {
  it('follows the phone: Indonesian only when its primary language is Indonesian', () => {
    expect(resolveLocale('system', ['id'])).toBe('id');
    expect(resolveLocale('system', ['in'])).toBe('id'); // legacy Android code
    expect(resolveLocale('system', ['id-ID'])).toBe('id');
    expect(resolveLocale('system', ['en', 'id'])).toBe('en');
    expect(resolveLocale('system', ['fr'])).toBe('en');
    expect(resolveLocale('system', [null, 'id'])).toBe('id');
    expect(resolveLocale('system', [])).toBe('en');
  });

  it('uses an explicit choice whatever the phone says', () => {
    expect(resolveLocale('id', ['en'])).toBe('id');
    expect(resolveLocale('en', ['id'])).toBe('en');
  });
});

describe('number formats per language', () => {
  it('formats Indonesian as "€ 2.655,38" and English as "€2,655.38"', () => {
    expect(formatMoney(265538, 'EUR', { locale: 'id' })).toBe(`€${NBSP}2.655,38`);
    expect(formatMoney(265538, 'EUR', { locale: 'en' })).toBe('€2,655.38');
    expect(formatMoney(-1250, 'EUR', { locale: 'en' })).toBe('-€12.50');
    expect(formatMoney(12_500_000, 'IDR', { locale: 'id' })).toBe(`Rp${NBSP}12.500.000`);
    expect(formatMoney(12_500_000, 'IDR', { locale: 'en' })).toBe(`Rp${NBSP}12,500,000`);
    expect(formatMoney(4200, 'EUR', { locale: 'en', sign: true })).toBe('+€42.00');
  });

  it('follows the active language by default', () => {
    expect(formatMoney(265538, 'EUR')).toBe(`€${NBSP}2.655,38`);
    setLocale('en');
    expect(formatMoney(265538, 'EUR')).toBe('€2,655.38');
    expect(formatInputValue(1250, 'EUR')).toBe('12.50');
    expect(formatMoneyDisplay(265538, 'EUR', { hidden: true })).toBe(`€${NBSP}••••`);
  });

  it('prefills inputs in the language and parses them back', () => {
    for (const locale of ['id', 'en'] as const) {
      for (const [minor, currency] of [[265538, 'EUR'], [1250, 'EUR'], [12_500_000, 'IDR']] as const) {
        expect(parseAmount(formatInputValue(minor, currency, locale), currency)).toBe(minor);
      }
    }
  });

  it('accepts both formats as input, whatever the language', () => {
    expect(parseAmount('2.655,38', 'EUR')).toBe(265538);
    expect(parseAmount('2,655.38', 'EUR')).toBe(265538);
    expect(parseAmount('12,5', 'EUR')).toBe(1250);
    expect(parseAmount('12.5', 'EUR')).toBe(1250);
    expect(parseAmount('12.500.000', 'IDR')).toBe(12_500_000);
    expect(parseAmount('12,500,000', 'IDR')).toBe(12_500_000);
    expect(parseAmount('1.234,56.7', 'EUR')).toBeNull();
  });
});

describe('spoken amounts', () => {
  it('reads euros and cents, and rupiah, in words', () => {
    expect(spokenAmount(-1250, 'EUR', { locale: 'id' })).toBe('minus 12 euro 50 sen');
    expect(spokenAmount(-1250, 'EUR', { locale: 'en' })).toBe('minus 12 euros 50 cents');
    expect(spokenAmount(101, 'EUR', { locale: 'en' })).toBe('1 euro 1 cent');
    expect(spokenAmount(50, 'EUR', { locale: 'en' })).toBe('50 cents');
    expect(spokenAmount(0, 'EUR', { locale: 'id' })).toBe('0 euro');
    expect(spokenAmount(12_500, 'IDR', { locale: 'id', sign: true })).toBe('plus 12500 rupiah');
  });

  it('is what <Money> gives screen readers, or "hidden" while masked', () => {
    expect(moneyDisplay(-1250, 'EUR', { locale: 'id' }).accessibilityLabel).toBe('minus 12 euro 50 sen');
    expect(moneyDisplay(-1250, 'EUR', { locale: 'en', hidden: true }).accessibilityLabel).toBe('Balance hidden');
  });
});
