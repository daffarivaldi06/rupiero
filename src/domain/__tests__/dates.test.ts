import {
  addMonths,
  currentMonth,
  dateInMonth,
  daysInMonth,
  formatDateLabel,
  formatDayHeader,
  formatMonthLabel,
  formatMonthShort,
  fromLocalDate,
  isValidLocalDate,
  monthOf,
  monthRange,
  toLocalDate,
  todayLocal,
} from '../dates';

describe('local dates', () => {
  it('uses the local calendar day, not UTC', () => {
    // 00:30 local time on the 1st must stay on the 1st whatever the device timezone is.
    const justAfterMidnight = new Date(2026, 9, 1, 0, 30);
    expect(todayLocal(justAfterMidnight)).toBe('2026-10-01');
    expect(currentMonth(justAfterMidnight)).toBe('2026-10');

    const lastMinute = new Date(2026, 9, 31, 23, 59);
    expect(toLocalDate(lastMinute)).toBe('2026-10-31');
    expect(currentMonth(lastMinute)).toBe('2026-10');
  });

  it('round-trips through Date', () => {
    expect(toLocalDate(fromLocalDate('2028-02-29'))).toBe('2028-02-29');
  });

  it('validates dates', () => {
    expect(isValidLocalDate('2026-02-28')).toBe(true);
    expect(isValidLocalDate('2026-02-29')).toBe(false);
    expect(isValidLocalDate('2028-02-29')).toBe(true);
    expect(isValidLocalDate('2026-13-01')).toBe(false);
    expect(isValidLocalDate('2026-10-1')).toBe(false);
    expect(isValidLocalDate('2026-10-01T00:00:00Z')).toBe(false);
  });

  it('derives the month', () => {
    expect(monthOf('2026-10-31')).toBe('2026-10');
    expect(() => monthOf('2026-10')).toThrow(RangeError);
  });
});

describe('months', () => {
  it('adds months across year boundaries', () => {
    expect(addMonths('2026-12', 1)).toBe('2027-01');
    expect(addMonths('2026-01', -1)).toBe('2025-12');
    expect(addMonths('2026-10', -14)).toBe('2025-08');
    expect(addMonths('2026-10', 0)).toBe('2026-10');
  });

  it('knows month lengths including leap years', () => {
    expect(daysInMonth(2026, 2)).toBe(28);
    expect(daysInMonth(2028, 2)).toBe(29);
    expect(daysInMonth(2100, 2)).toBe(28);
    expect(daysInMonth(2000, 2)).toBe(29);
    expect(daysInMonth(2026, 4)).toBe(30);
  });

  it('gives an inclusive range', () => {
    expect(monthRange('2026-02')).toEqual({ start: '2026-02-01', end: '2026-02-28' });
    expect(monthRange('2026-12')).toEqual({ start: '2026-12-01', end: '2026-12-31' });
  });

  it('clamps days to the end of the month', () => {
    expect(dateInMonth('2026-02', 31)).toBe('2026-02-28');
    expect(dateInMonth('2028-02', 30)).toBe('2028-02-29');
    expect(dateInMonth('2026-04', 31)).toBe('2026-04-30');
    expect(dateInMonth('2026-10', 5)).toBe('2026-10-05');
  });
});

describe('labels', () => {
  it('formats in Indonesian', () => {
    expect(formatMonthLabel('2026-10')).toBe('Oktober 2026');
    expect(formatMonthLabel('2027-01')).toBe('Januari 2027');
    expect(formatMonthShort('2026-10')).toBe('Okt 2026');
    expect(formatMonthShort('2026-05')).toBe('Mei 2026');
    expect(formatDateLabel('2026-10-05')).toBe('5 Okt 2026');
    expect(formatDateLabel('2026-08-31')).toBe('31 Agu 2026');
  });

  it('formats ledger day headers with the weekday', () => {
    expect(formatDayHeader('2026-10-31')).toBe('Sab, 31 Okt');
    expect(formatDayHeader('2026-11-01')).toBe('Min, 1 Nov');
    expect(formatDayHeader('2028-02-29')).toBe('Sel, 29 Feb');
  });
});
