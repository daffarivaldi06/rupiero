// Pure helpers for the hand-drawn SVG charts (no chart library: exact Buku Kas styling, no extra
// native dependency).
import { t } from '../i18n';

export interface Share<K> {
  key: K | 'other';
  label: string;
  value: number;
  /** Whole percent of the total, half-up. The rounded values may not add up to exactly 100. */
  percent: number;
}

/**
 * The `top` largest items as they are, the rest folded into one "Other (n)" entry, each with its
 * share of the total. Items with no value are dropped.
 */
export function topShares<K>(items: { key: K; label: string; value: number }[], top: number): Share<K>[] {
  const positive = items.filter((i) => i.value > 0).sort((a, b) => b.value - a.value);
  const total = positive.reduce((sum, i) => sum + i.value, 0);
  if (total === 0) return [];
  const percent = (value: number) => Math.round((value * 100) / total);
  const head: Share<K>[] = positive.slice(0, top).map((i) => ({ ...i, percent: percent(i.value) }));
  const rest = positive.slice(top);
  if (rest.length === 0) return head;
  const value = rest.reduce((sum, i) => sum + i.value, 0);
  return [...head, { key: 'other', label: t('chart.other', { count: rest.length }), value, percent: percent(value) }];
}

export interface Arc {
  /** Stroke length along the circle. */
  length: number;
  /** Where the arc starts, measured along the circle from the top, clockwise. */
  start: number;
}

/**
 * Arcs for a donut drawn with dashed circle strokes: each value gets its share of the
 * circumference, minus a small gap between neighbours (no gap for a single value).
 */
export function donutArcs(values: number[], circumference: number, gap: number): Arc[] {
  const total = values.reduce((sum, v) => sum + v, 0);
  if (total <= 0) return [];
  const gaps = values.length > 1 ? gap : 0;
  let start = 0;
  return values.map((value) => {
    const share = (value / total) * circumference;
    const arc = { length: Math.max(share - gaps, 0), start: start + gaps / 2 };
    start += share;
    return arc;
  });
}

/** Bar heights scaled to the largest value; a non-zero value never drops below `min` so it stays visible. */
export function barHeights(values: number[], maxHeight: number, min = 2): number[] {
  const max = Math.max(...values, 0);
  if (max === 0) return values.map(() => 0);
  return values.map((v) => (v <= 0 ? 0 : Math.max((v / max) * maxHeight, min)));
}
