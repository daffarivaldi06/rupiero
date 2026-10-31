import { countUpFrame } from '../countUp';

const frames = (target: number) => Array.from({ length: 101 }, (_, i) => countUpFrame(target, i / 100));

describe('countUpFrame', () => {
  it('starts at 0 and ends exactly on the target', () => {
    expect(countUpFrame(265538, 0)).toBe(0);
    expect(countUpFrame(265538, 1)).toBe(265538);
    expect(countUpFrame(265538, 1.5)).toBe(265538);
    expect(countUpFrame(265538, 0.999)).not.toBe(265538);
  });

  it('only counts up and never passes the target', () => {
    for (const target of [265538, 6_127_030, 1, 7]) {
      const values = frames(target);
      values.forEach((value, i) => {
        expect(value).toBeLessThanOrEqual(target);
        if (i > 0) expect(value).toBeGreaterThanOrEqual(values[i - 1]);
      });
    }
  });

  it('counts negative balances from 0 down to the target', () => {
    const values = frames(-12_345);
    values.forEach((value, i) => {
      expect(value).toBeGreaterThanOrEqual(-12_345);
      expect(value).toBeLessThanOrEqual(0);
      if (i > 0) expect(value).toBeLessThanOrEqual(values[i - 1]);
    });
    expect(Object.is(countUpFrame(-12_345, 0), 0)).toBe(true);
    expect(values[100]).toBe(-12_345);
  });

  it('stays an integer number of minor units', () => {
    expect(frames(6_127_030).every(Number.isInteger)).toBe(true);
  });
});
