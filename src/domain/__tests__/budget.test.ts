import { budgetStatus, sortByUsage } from '../budget';

describe('sortByUsage', () => {
  const line = (name: string, spentMinor: number, limitMinor: number) => ({ name, spentMinor, limitMinor });

  it('puts the highest share of the limit first, over budget at the top', () => {
    const sorted = sortByUsage([line('transport', 3500, 10000), line('fun', 10400, 10000), line('groceries', 7200, 10000)]);
    expect(sorted.map((l) => l.name)).toEqual(['fun', 'groceries', 'transport']);
  });

  it('compares shares exactly, not the rounded percent', () => {
    // 66.66…% vs 66.7%: both round to 67 %.
    const sorted = sortByUsage([line('a', 2000, 3000), line('b', 667, 1000)]);
    expect(sorted.map((l) => l.name)).toEqual(['b', 'a']);
  });

  it('keeps the order of equal shares and does not change the input', () => {
    const input = [line('x', 500, 1000), line('y', 50_000, 100_000), line('z', 900, 1000)];
    expect(sortByUsage(input).map((l) => l.name)).toEqual(['z', 'x', 'y']);
    expect(input.map((l) => l.name)).toEqual(['x', 'y', 'z']);
  });

  it('handles IDR-sized amounts without losing precision', () => {
    const sorted = sortByUsage([line('rent', 9_007_199_254_740_000, 9_007_199_254_740_991), line('ok', 1, 2)]);
    expect(sorted.map((l) => l.name)).toEqual(['rent', 'ok']);
  });
});

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
