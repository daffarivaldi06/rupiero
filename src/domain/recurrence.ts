// When a recurring rule falls due. Every occurrence is computed from the start date (n × interval),
// never from the previous one, so a monthly rule on the 31st clamps to 30 Apr / 28 Feb and still
// returns to the 31st afterwards.
import { addDays, addMonths, daysBetween, dateInMonth, formatDayMonth, monthOf, type LocalDate } from './dates';

export type Frequency = 'daily' | 'weekly' | 'monthly' | 'yearly';
export const FREQUENCIES: Frequency[] = ['daily', 'weekly', 'monthly', 'yearly'];

export interface RecurrenceRule {
  frequency: Frequency;
  /** Every `interval` days/weeks/months/years, ≥ 1. */
  interval: number;
  startDate: LocalDate;
  /** Last day an occurrence may fall on (inclusive); null = no end. */
  endDate: LocalDate | null;
  paused: boolean;
}

/** Guards against runaway loops (e.g. a daily rule scanned over decades). */
const MAX_OCCURRENCES = 20_000;

/** The n-th occurrence (0 = the start date). */
export function occurrenceAt(rule: RecurrenceRule, n: number): LocalDate {
  const step = n * rule.interval;
  const day = Number(rule.startDate.slice(8, 10));
  switch (rule.frequency) {
    case 'daily':
      return addDays(rule.startDate, step);
    case 'weekly':
      return addDays(rule.startDate, 7 * step);
    case 'monthly':
      return dateInMonth(addMonths(monthOf(rule.startDate), step), day);
    case 'yearly':
      return dateInMonth(addMonths(monthOf(rule.startDate), 12 * step), day);
  }
}

/** Index of the first occurrence on or after `date` (never negative). */
function firstIndexFrom(rule: RecurrenceRule, date: LocalDate): number {
  if (date <= rule.startDate) return 0;
  let n: number;
  if (rule.frequency === 'daily' || rule.frequency === 'weekly') {
    const days = (rule.frequency === 'weekly' ? 7 : 1) * rule.interval;
    n = Math.ceil(daysBetween(rule.startDate, date) / days);
  } else {
    const months = (rule.frequency === 'yearly' ? 12 : 1) * rule.interval;
    const elapsed = monthDiff(monthOf(rule.startDate), monthOf(date));
    n = Math.max(0, Math.floor(elapsed / months));
  }
  // The estimate can be one step early for month-based rules (clamped days); walk forward.
  while (occurrenceAt(rule, n) < date) n++;
  return n;
}

const monthDiff = (from: string, to: string) =>
  (Number(to.slice(0, 4)) - Number(from.slice(0, 4))) * 12 + Number(to.slice(5, 7)) - Number(from.slice(5, 7));

/** Occurrences between `from` and `to` (both inclusive), within the rule's end date; none while paused. */
export function occurrences(rule: RecurrenceRule, from: LocalDate, to: LocalDate): LocalDate[] {
  if (rule.paused) return [];
  const last = rule.endDate !== null && rule.endDate < to ? rule.endDate : to;
  const dates: LocalDate[] = [];
  for (let n = firstIndexFrom(rule, from); dates.length < MAX_OCCURRENCES; n++) {
    const date = occurrenceAt(rule, n);
    if (date > last) break;
    dates.push(date);
  }
  return dates;
}

/** The first occurrence on or after `today`, or null when paused or past the end date. */
export function nextDueDate(rule: RecurrenceRule, today: LocalDate): LocalDate | null {
  if (rule.paused) return null;
  const next = occurrenceAt(rule, firstIndexFrom(rule, today));
  return rule.endDate !== null && next > rule.endDate ? null : next;
}

/**
 * What the rule costs per month on average, rounded half-up to a minor unit: daily × 365/12,
 * weekly × 52/12, monthly, yearly ÷ 12, each divided by the interval.
 */
export function monthlyEquivalent(rule: { frequency: Frequency; interval: number; amountMinor: number }): number {
  const perYear: Record<Frequency, bigint> = { daily: 365n, weekly: 52n, monthly: 12n, yearly: 1n };
  const num = BigInt(rule.amountMinor) * perYear[rule.frequency];
  const den = 12n * BigInt(rule.interval);
  return Number((num * 2n + den) / (den * 2n));
}

const UNIT: Record<Frequency, string> = { daily: 'hari', weekly: 'minggu', monthly: 'bulan', yearly: 'tahun' };

/** "Tiap bulan", "Tiap 2 hari". */
export function describeFrequency(frequency: Frequency, interval: number): string {
  return interval === 1 ? `Tiap ${UNIT[frequency]}` : `Tiap ${interval} ${UNIT[frequency]}`;
}

/** "Tiap bulan · berikutnya 30 Nov", "Tiap 2 hari · dijeda", "Tiap minggu · berhenti". */
export function describeSchedule(rule: RecurrenceRule, today: LocalDate): string {
  const next = nextDueDate(rule, today);
  const state = rule.paused ? 'dijeda' : next ? `berikutnya ${formatDayMonth(next)}` : 'berhenti';
  return `${describeFrequency(rule.frequency, rule.interval)} · ${state}`;
}
