import { groupByDate, type LedgerEntry } from '../ledger';

const entry = (date: string, currency: 'EUR' | 'IDR', signedMinor: number, id: number) => ({ id, date, currency, signedMinor });
const asEntry = (e: LedgerEntry) => e;

it('groups consecutive items by date with per-currency day totals', () => {
  const items = [
    entry('2026-10-31', 'IDR', -35_000, 1),
    entry('2026-10-31', 'EUR', -1250, 2),
    entry('2026-10-31', 'EUR', 185000, 3),
    entry('2026-10-30', 'IDR', -18_500, 4),
  ];

  const days = groupByDate(items, asEntry);

  expect(days.map((d) => [d.date, d.items.map((i) => i.id)])).toEqual([
    ['2026-10-31', [1, 2, 3]],
    ['2026-10-30', [4]],
  ]);
  expect(days[0].totals).toEqual([
    { currency: 'EUR', netMinor: 183750 },
    { currency: 'IDR', netMinor: -35_000 },
  ]);
  expect(days[1].totals).toEqual([{ currency: 'IDR', netMinor: -18_500 }]);
});

it('returns nothing for an empty list', () => {
  expect(groupByDate([], asEntry)).toEqual([]);
});
