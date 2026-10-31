import { budgetStatus } from '../budget';

describe('budgetStatus', () => {
  it('reports 83 % with a warning for € 250 of € 300', () => {
    expect(budgetStatus(25000, 30000)).toEqual({
      spentMinor: 25000,
      limitMinor: 30000,
      remainingMinor: 5000,
      percent: 83,
      level: 'warning',
    });
  });

  it('switches level at exactly 80 % and beyond 100 %', () => {
    expect(budgetStatus(23999, 30000).level).toBe('ok'); // 79,997 %
    expect(budgetStatus(24000, 30000).level).toBe('warning');
    expect(budgetStatus(30000, 30000)).toMatchObject({ level: 'warning', percent: 100, remainingMinor: 0 });
    expect(budgetStatus(30001, 30000)).toMatchObject({ level: 'over', percent: 100, remainingMinor: -1 });
    expect(budgetStatus(45000, 30000)).toMatchObject({ level: 'over', percent: 150 });
  });

  it('handles nothing spent and large rupiah amounts', () => {
    expect(budgetStatus(0, 30000)).toMatchObject({ level: 'ok', percent: 0 });
    expect(budgetStatus(4_500_000_000, 6_000_000_000)).toMatchObject({ level: 'ok', percent: 75 });
  });

  it('rejects a non-positive limit', () => {
    expect(() => budgetStatus(1, 0)).toThrow(RangeError);
  });
});
