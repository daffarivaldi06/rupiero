import { barHeights, donutArcs, topShares } from '../chart';

describe('topShares', () => {
  const items = [
    { key: 1, label: 'Sewa', value: 65000 },
    { key: 2, label: 'Makanan', value: 19870 },
    { key: 3, label: 'Transport', value: 8640 },
    { key: 4, label: 'Tagihan', value: 3999 },
    { key: 5, label: 'Hiburan', value: 1250 },
    { key: 6, label: 'Kesehatan', value: 0 },
  ];

  it('keeps the largest items and folds the rest into "Lainnya"', () => {
    expect(topShares(items, 3)).toEqual([
      { key: 1, label: 'Sewa', value: 65000, percent: 66 },
      { key: 2, label: 'Makanan', value: 19870, percent: 20 },
      { key: 3, label: 'Transport', value: 8640, percent: 9 },
      { key: 'other', label: 'Lainnya (2)', value: 5249, percent: 5 },
    ]);
  });

  it('shows a single leftover item by name instead of "Other (1)"', () => {
    expect(topShares(items, 4).map((s) => s.label)).toEqual(['Sewa', 'Makanan', 'Transport', 'Tagihan', 'Hiburan']);
  });

  it('drops empty items and handles no spending', () => {
    expect(topShares(items, 10).map((s) => s.key)).toEqual([1, 2, 3, 4, 5]);
    expect(topShares([{ key: 1, label: 'x', value: 0 }], 5)).toEqual([]);
  });
});

describe('donutArcs', () => {
  it('splits the circumference by share with gaps between arcs', () => {
    expect(donutArcs([3, 1], 100, 2)).toEqual([
      { length: 73, start: 1 },
      { length: 23, start: 76 },
    ]);
  });

  it('draws a single value as a full ring and nothing for no data', () => {
    expect(donutArcs([5], 100, 2)).toEqual([{ length: 100, start: 0 }]);
    expect(donutArcs([], 100, 2)).toEqual([]);
    expect(donutArcs([0, 0], 100, 2)).toEqual([]);
  });

  it('never produces negative lengths for tiny shares', () => {
    expect(donutArcs([1000, 1], 100, 2)[1].length).toBe(0);
  });
});

describe('barHeights', () => {
  it('scales to the largest value and keeps small values visible', () => {
    expect(barHeights([0, 50, 100, 1], 80)).toEqual([0, 40, 80, 2]);
    expect(barHeights([0, 0], 80)).toEqual([0, 0]);
  });
});
