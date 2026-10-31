// t('section.key', { param }) looks a message up in the active language and fills in {param}s.
// Works outside React too (widget, repos, formatters); components use useI18n() so they re-render
// when the language changes.
import { en } from './messages/en';
import { id, type Messages } from './messages/id';
import { getLocale, type Locale } from './locale';

export const DICTIONARIES: Record<Locale, Messages> = { id, en };

type Leaves<T, Prefix extends string = ''> = {
  [K in keyof T & string]: T[K] extends string ? `${Prefix}${K}` : Leaves<T[K], `${Prefix}${K}.`>;
}[keyof T & string];

export type MessageKey = Leaves<Messages>;
export type MessageParams = Record<string, string | number>;

function lookup(locale: Locale, key: string): string {
  let value: unknown = DICTIONARIES[locale];
  for (const part of key.split('.')) value = (value as Record<string, unknown> | undefined)?.[part];
  if (typeof value !== 'string') throw new Error(`Missing message "${key}" (${locale})`);
  return value;
}

export function t(key: MessageKey, params?: MessageParams, locale: Locale = getLocale()): string {
  const template = lookup(locale, key);
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) => (name in params ? String(params[name]) : match));
}

/**
 * A message split around its {placeholders}, for text that embeds components (e.g. <Money>):
 * splitMessage('{spent} of {limit}') → ['', 'spent', ' of ', 'limit', ''] — even indexes are text,
 * odd indexes are placeholder names.
 */
export function splitMessage(key: MessageKey, locale: Locale = getLocale()): string[] {
  return lookup(locale, key).split(/\{(\w+)\}/);
}

export type { Locale, LanguagePreference } from './locale';
