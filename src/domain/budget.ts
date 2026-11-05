export type BudgetLevel = 'ok' | 'warning' | 'over';

export interface BudgetStatus {
  spentMinor: number;
  limitMinor: number;
  /** Negative once over budget. */
  remainingMinor: number;
  /** Spent as a whole percentage of the limit, half-up (may exceed 100). */
  percent: number;
  /** Warning from 80 % of the limit, over beyond 100 %. Decided on exact amounts, not the rounded percent. */
  level: BudgetLevel;
}

export const WARNING_PERCENT = 80;

export function budgetStatus(spentMinor: number, limitMinor: number): BudgetStatus {
  if (limitMinor <= 0) throw new RangeError(`Budget limit must be positive, got ${limitMinor}`);
  const spent = BigInt(spentMinor);
  const limit = BigInt(limitMinor);
  const percent = Number((spent * 200n + limit) / (limit * 2n));
  const level: BudgetLevel = spent > limit ? 'over' : spent * 100n >= BigInt(WARNING_PERCENT) * limit ? 'warning' : 'ok';
  return { spentMinor, limitMinor, remainingMinor: limitMinor - spentMinor, percent, level };
}

/**
 * Budgets by share of the limit used, highest first. Compared exactly (spent × other limit, in
 * BigInt), so two budgets with the same rounded percent still sort right; equal shares keep their order.
 */
export function sortByUsage<T extends { spentMinor: number; limitMinor: number }>(lines: readonly T[]): T[] {
  return [...lines].sort((a, b) => {
    const diff = BigInt(b.spentMinor) * BigInt(a.limitMinor) - BigInt(a.spentMinor) * BigInt(b.limitMinor);
    return diff > 0n ? 1 : diff < 0n ? -1 : 0;
  });
}
