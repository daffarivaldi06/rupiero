// Dates are stored as local calendar dates ('YYYY-MM-DD') and months as 'YYYY-MM'.
// Never derive them from toISOString(): that is UTC and shifts entries across day/month boundaries.
// Labels use the active UI language unless a locale is passed.
import { CALENDAR } from '../i18n/calendar';
import { getLocale, type Locale } from '../i18n/locale';

export type LocalDate = string;
export type Month = string;

const pad2 = (n: number) => n.toString().padStart(2, '0');

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

export function daysInMonth(year: number, month: number): number {
  return [31, isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1];
}

export function isValidLocalDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const [year, month, day] = match.slice(1).map(Number);
  return month >= 1 && month <= 12 && day >= 1 && day <= daysInMonth(year, month);
}

export function isValidMonth(value: string): boolean {
  const match = /^(\d{4})-(\d{2})$/.exec(value);
  return !!match && Number(match[2]) >= 1 && Number(match[2]) <= 12;
}

function parseMonth(month: Month): [number, number] {
  if (!isValidMonth(month)) throw new RangeError(`Invalid month: ${month}`);
  return [Number(month.slice(0, 4)), Number(month.slice(5, 7))];
}

/** The local calendar date of a Date object. */
export function toLocalDate(date: Date): LocalDate {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

/** Local midnight of a stored date, e.g. for a date picker. */
export function fromLocalDate(date: LocalDate): Date {
  if (!isValidLocalDate(date)) throw new RangeError(`Invalid date: ${date}`);
  return new Date(Number(date.slice(0, 4)), Number(date.slice(5, 7)) - 1, Number(date.slice(8, 10)));
}

export function todayLocal(now: Date = new Date()): LocalDate {
  return toLocalDate(now);
}

/** `date` shifted by `days` calendar days (negative goes back), across months and years. */
export function addDays(date: LocalDate, days: number): LocalDate {
  const d = fromLocalDate(date);
  return toLocalDate(new Date(d.getFullYear(), d.getMonth(), d.getDate() + days));
}

/** Calendar days from `from` to `to` (negative if `to` is earlier). DST-safe: counts in UTC. */
export function daysBetween(from: LocalDate, to: LocalDate): number {
  const utc = (d: LocalDate) => Date.UTC(Number(d.slice(0, 4)), Number(d.slice(5, 7)) - 1, Number(d.slice(8, 10)));
  return Math.round((utc(to) - utc(from)) / 86_400_000);
}

export function monthOf(date: LocalDate): Month {
  if (!isValidLocalDate(date)) throw new RangeError(`Invalid date: ${date}`);
  return date.slice(0, 7);
}

export function currentMonth(now: Date = new Date()): Month {
  return monthOf(todayLocal(now));
}

export function addMonths(month: Month, offset: number): Month {
  const [year, m] = parseMonth(month);
  const index = year * 12 + (m - 1) + offset;
  return `${Math.floor(index / 12)}-${pad2((index % 12) + 1)}`;
}

/** First and last day of a month, both inclusive. */
export function monthRange(month: Month): { start: LocalDate; end: LocalDate } {
  const [year, m] = parseMonth(month);
  return { start: `${month}-01`, end: `${month}-${pad2(daysInMonth(year, m))}` };
}

/** A date in `month` on `day`, clamped to the month's last day (31 → 30 Apr, 28/29 Feb). */
export function dateInMonth(month: Month, day: number): LocalDate {
  const [year, m] = parseMonth(month);
  return `${month}-${pad2(Math.min(Math.max(day, 1), daysInMonth(year, m)))}`;
}

/** "2026-10" → "Oktober 2026" / "October 2026". */
export function formatMonthLabel(month: Month, locale: Locale = getLocale()): string {
  const [year, m] = parseMonth(month);
  return `${CALENDAR[locale].months[m - 1]} ${year}`;
}

/** "2026-10" → "Oktober" / "October". */
export function formatMonthName(month: Month, locale: Locale = getLocale()): string {
  return CALENDAR[locale].months[parseMonth(month)[1] - 1];
}

/** "2026-10" → "Okt 2026" / "Oct 2026" (compact headers). */
export function formatMonthShort(month: Month, locale: Locale = getLocale()): string {
  const [year, m] = parseMonth(month);
  return `${CALENDAR[locale].monthsShort[m - 1]} ${year}`;
}

const shortMonthOf = (date: LocalDate, locale: Locale) => CALENDAR[locale].monthsShort[Number(date.slice(5, 7)) - 1];

/** "2026-10-31" → "31 Okt 2026" / "31 Oct 2026". */
export function formatDateLabel(date: LocalDate, locale: Locale = getLocale()): string {
  if (!isValidLocalDate(date)) throw new RangeError(`Invalid date: ${date}`);
  return `${Number(date.slice(8, 10))} ${shortMonthOf(date, locale)} ${date.slice(0, 4)}`;
}

/** "2026-10-30" → "30 Okt" / "30 Oct" (rate dates, date chips). */
export function formatDayMonth(date: LocalDate, locale: Locale = getLocale()): string {
  if (!isValidLocalDate(date)) throw new RangeError(`Invalid date: ${date}`);
  return `${Number(date.slice(8, 10))} ${shortMonthOf(date, locale)}`;
}

/** "2026-10-31" → "Sab, 31 Okt" / "Sat, 31 Oct" (ledger day headers). */
export function formatDayHeader(date: LocalDate, locale: Locale = getLocale()): string {
  const weekday = CALENDAR[locale].weekdaysShort[fromLocalDate(date).getDay()];
  return `${weekday}, ${Number(date.slice(8, 10))} ${shortMonthOf(date, locale)}`;
}
