import type { LocalDate } from './dates';
import type { CurrencyCode } from './money';

export interface LedgerEntry {
  date: LocalDate;
  currency: CurrencyCode;
  /** Positive for money in, negative for money out. */
  signedMinor: number;
}

export interface DayTotal {
  currency: CurrencyCode;
  netMinor: number;
}

export interface LedgerDay<T> {
  date: LocalDate;
  items: T[];
  /** Net per currency for the day, currencies in alphabetical order; never mixed. */
  totals: DayTotal[];
}

/** Groups consecutive items by date, keeping their order (lists arrive newest first). */
export function groupByDate<T>(items: T[], entry: (item: T) => LedgerEntry): LedgerDay<T>[] {
  const days: LedgerDay<T>[] = [];
  const totalsByDay = new Map<LedgerDay<T>, Map<CurrencyCode, number>>();

  for (const item of items) {
    const { date, currency, signedMinor } = entry(item);
    let day = days[days.length - 1];
    if (!day || day.date !== date) {
      day = { date, items: [], totals: [] };
      days.push(day);
      totalsByDay.set(day, new Map());
    }
    day.items.push(item);
    const totals = totalsByDay.get(day)!;
    totals.set(currency, (totals.get(currency) ?? 0) + signedMinor);
  }

  for (const [day, totals] of totalsByDay) {
    day.totals = [...totals]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([currency, netMinor]) => ({ currency, netMinor }));
  }
  return days;
}
