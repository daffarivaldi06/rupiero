import {
  describeFrequency,
  describeSchedule,
  monthlyEquivalent,
  nextDueDate,
  occurrenceAt,
  occurrences,
  type RecurrenceRule,
} from '../recurrence';

const rule = (overrides: Partial<RecurrenceRule>): RecurrenceRule => ({
  frequency: 'monthly',
  interval: 1,
  startDate: '2026-01-31',
  endDate: null,
  paused: false,
  ...overrides,
});

describe('occurrences', () => {
  it('clamps a monthly rule on the 31st to each month’s last day and returns to the 31st', () => {
    expect(occurrences(rule({}), '2026-01-01', '2026-06-30')).toEqual([
      '2026-01-31',
      '2026-02-28',
      '2026-03-31',
      '2026-04-30',
      '2026-05-31',
      '2026-06-30',
    ]);
    expect(occurrences(rule({ startDate: '2028-01-31' }), '2028-02-01', '2028-02-29')).toEqual(['2028-02-29']); // leap year
  });

  it('keeps yearly rules on 29 Feb to 28 Feb outside leap years', () => {
    expect(occurrences(rule({ frequency: 'yearly', startDate: '2028-02-29' }), '2028-01-01', '2033-12-31')).toEqual([
      '2028-02-29',
      '2029-02-28',
      '2030-02-28',
      '2031-02-28',
      '2032-02-29',
      '2033-02-28',
    ]);
  });

  it('steps weekly and by interval', () => {
    expect(occurrences(rule({ frequency: 'weekly', startDate: '2026-10-05' }), '2026-10-01', '2026-10-31')).toEqual([
      '2026-10-05',
      '2026-10-12',
      '2026-10-19',
      '2026-10-26',
    ]);
    expect(occurrences(rule({ frequency: 'weekly', interval: 2, startDate: '2026-10-05' }), '2026-10-01', '2026-11-30')).toEqual([
      '2026-10-05',
      '2026-10-19',
      '2026-11-02',
      '2026-11-16',
      '2026-11-30',
    ]);
    expect(occurrences(rule({ interval: 3, startDate: '2026-01-15' }), '2026-01-01', '2026-12-31')).toEqual([
      '2026-01-15',
      '2026-04-15',
      '2026-07-15',
      '2026-10-15',
    ]);
  });

  it('supports daily rules with an interval, across month ends', () => {
    expect(occurrences(rule({ frequency: 'daily', interval: 2, startDate: '2026-10-30' }), '2026-10-01', '2026-11-03')).toEqual([
      '2026-10-30',
      '2026-11-01',
      '2026-11-03',
    ]);
    expect(occurrences(rule({ frequency: 'daily', startDate: '2026-12-30' }), '2026-12-31', '2027-01-02')).toEqual([
      '2026-12-31',
      '2027-01-01',
      '2027-01-02',
    ]);
  });

  it('starts mid-range without listing earlier occurrences', () => {
    expect(occurrences(rule({ frequency: 'daily', interval: 3, startDate: '2026-01-01' }), '2026-10-30', '2026-11-05')).toEqual([
      '2026-10-31', // day 303 = 101 × 3
      '2026-11-03',
    ]);
    expect(occurrences(rule({}), '2026-03-01', '2026-03-31')).toEqual(['2026-03-31']);
  });

  it('never starts before the start date', () => {
    expect(occurrences(rule({ startDate: '2026-10-15' }), '2026-01-01', '2026-10-14')).toEqual([]);
  });

  it('respects the end date and pause', () => {
    expect(occurrences(rule({ endDate: '2026-03-31' }), '2026-01-01', '2026-12-31')).toEqual(['2026-01-31', '2026-02-28', '2026-03-31']);
    expect(occurrences(rule({ paused: true }), '2026-01-01', '2026-12-31')).toEqual([]);
  });

  it('agrees with occurrenceAt', () => {
    const r = rule({ frequency: 'weekly', interval: 3, startDate: '2026-02-03' });
    expect(occurrences(r, '2026-01-01', '2026-03-31')).toEqual([0, 1, 2, 3].map((n) => occurrenceAt(r, n)).filter((d) => d <= '2026-03-31'));
  });
});

describe('nextDueDate', () => {
  it('finds the next occurrence on or after today', () => {
    expect(nextDueDate(rule({ startDate: '2026-01-31' }), '2026-10-31')).toBe('2026-10-31');
    expect(nextDueDate(rule({ startDate: '2026-01-31' }), '2026-11-01')).toBe('2026-11-30');
    expect(nextDueDate(rule({ startDate: '2026-12-01' }), '2026-10-31')).toBe('2026-12-01');
    expect(nextDueDate(rule({ frequency: 'daily', interval: 2, startDate: '2026-10-30' }), '2026-10-31')).toBe('2026-11-01');
  });

  it('is null when paused or ended', () => {
    expect(nextDueDate(rule({ paused: true }), '2026-10-31')).toBeNull();
    expect(nextDueDate(rule({ endDate: '2026-10-30' }), '2026-10-31')).toBeNull();
  });
});

describe('monthlyEquivalent', () => {
  it('spreads weekly, yearly and daily amounts over a month', () => {
    expect(monthlyEquivalent({ frequency: 'weekly', interval: 1, amountMinor: 999 })).toBe(4329); // € 9,99/minggu → € 43,29
    expect(monthlyEquivalent({ frequency: 'yearly', interval: 1, amountMinor: 1_200_000 })).toBe(100_000); // Rp 1,2 jt/tahun
    expect(monthlyEquivalent({ frequency: 'daily', interval: 1, amountMinor: 100 })).toBe(3042); // € 1/hari → € 30,42
    expect(monthlyEquivalent({ frequency: 'monthly', interval: 1, amountMinor: 65000 })).toBe(65000);
  });

  it('divides by the interval and rounds half-up', () => {
    expect(monthlyEquivalent({ frequency: 'monthly', interval: 3, amountMinor: 3000 })).toBe(1000);
    expect(monthlyEquivalent({ frequency: 'daily', interval: 2, amountMinor: 100 })).toBe(1521); // 1520,83
    expect(monthlyEquivalent({ frequency: 'monthly', interval: 2, amountMinor: 1 })).toBe(1); // 0,5 → 1
  });
});

it('describes frequencies in Indonesian', () => {
  expect(describeFrequency('monthly', 1)).toBe('Tiap bulan');
  expect(describeFrequency('daily', 2)).toBe('Tiap 2 hari');
  expect(describeFrequency('weekly', 1)).toBe('Tiap minggu');
  expect(describeFrequency('yearly', 1)).toBe('Tiap tahun');
});

it('describes the schedule with its state', () => {
  expect(describeSchedule(rule({ startDate: '2026-01-30' }), '2026-10-31')).toBe('Tiap bulan · berikutnya 30 Nov');
  expect(describeSchedule(rule({ frequency: 'daily', interval: 2, paused: true }), '2026-10-31')).toBe('Tiap 2 hari · dijeda');
  expect(describeSchedule(rule({ frequency: 'weekly', endDate: '2026-02-01' }), '2026-10-31')).toBe('Tiap minggu · berhenti');
});
