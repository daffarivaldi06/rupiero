import { t } from '../../i18n';
import { addMonths, type Month } from '../../domain/dates';
import type { CurrencyCode } from '../../domain/money';
import type { CurrencyTotals } from '../../domain/types';
import type { Db, SQLParam } from '../client';

/**
 * Income and expense per currency for a month, optionally for one category. Currencies are never
 * mixed: each row sums only movements on accounts of that currency. Transfer amounts are neither
 * income nor expense; transfer fees count as expense (and are reported again as `feeMinor`). Every
 * currency that has an active account gets a row, even with no activity.
 */
export async function getMonthSummary(
  db: Db,
  month: Month,
  options: { categoryId?: number } = {},
): Promise<CurrencyTotals[]> {
  const params: SQLParam[] = [month];
  let categoryClause = '';
  if (options.categoryId !== undefined) {
    // Transfer fees have no category, so this also leaves them out.
    categoryClause = 'AND l.category_id = ?';
    params.push(options.categoryId);
  }

  return db.getAllAsync<CurrencyTotals>(
    `SELECT a.currency AS currency,
            COALESCE(SUM(CASE WHEN l.signed_minor > 0 THEN l.signed_minor END), 0) AS incomeMinor,
            COALESCE(SUM(CASE WHEN l.signed_minor < 0 THEN -l.signed_minor END), 0) AS expenseMinor,
            COALESCE(SUM(CASE WHEN l.kind = 'transfer_fee' THEN -l.signed_minor END), 0) AS feeMinor
     FROM accounts a
     LEFT JOIN ledger l ON l.account_id = a.id AND l.month = ? AND l.kind IN ('tx', 'transfer_fee') ${categoryClause}
     WHERE a.archived = 0
     GROUP BY a.currency
     ORDER BY a.currency`,
    ...params,
  );
}

export interface CategoryCurrencyTotal {
  categoryId: number;
  currency: CurrencyCode;
  /** Income minus expense. */
  netMinor: number;
}

/** Net per category and currency for a month; only pairs with transactions get a row. */
export async function getCategoryMonthTotals(db: Db, month: Month): Promise<CategoryCurrencyTotal[]> {
  return db.getAllAsync<CategoryCurrencyTotal>(
    `SELECT t.category_id AS categoryId,
            a.currency AS currency,
            SUM(CASE t.type WHEN 'income' THEN t.amount_minor ELSE -t.amount_minor END) AS netMinor
     FROM transactions t
     JOIN accounts a ON a.id = t.account_id
     WHERE t.month = ? AND a.archived = 0
     GROUP BY t.category_id, a.currency
     ORDER BY a.currency, t.category_id`,
    month,
  );
}

export interface CategorySpending {
  currency: CurrencyCode;
  /** null for transfer fees. */
  categoryId: number | null;
  name: string;
  expenseMinor: number;
}

/**
 * The month's spending per category and currency, largest first, with transfer fees as their own
 * "Biaya transfer" / "Transfer fee" line (active language), so each currency adds up to getMonthSummary's expense.
 */
export async function getCategoryBreakdown(db: Db, month: Month): Promise<CategorySpending[]> {
  return db.getAllAsync<CategorySpending>(
    `SELECT a.currency AS currency, l.category_id AS categoryId, COALESCE(c.name, ?) AS name,
            SUM(-l.signed_minor) AS expenseMinor
     FROM ledger l
     JOIN accounts a ON a.id = l.account_id
     LEFT JOIN categories c ON c.id = l.category_id
     WHERE l.month = ? AND a.archived = 0
       AND ((l.kind = 'tx' AND l.signed_minor < 0) OR l.kind = 'transfer_fee')
     GROUP BY a.currency, l.category_id
     ORDER BY a.currency, expenseMinor DESC, name`,
    t('common.transferFee'),
    month,
  );
}

export interface MonthSpending {
  month: Month;
  currency: CurrencyCode;
  expenseMinor: number;
}

/**
 * Spending per month for the `count` months ending at `endMonth`, oldest first, for every currency
 * with an active account; months without spending are 0. Same definition as getMonthSummary.
 */
export async function getMonthlyTrend(db: Db, endMonth: Month, count = 6): Promise<MonthSpending[]> {
  const months = Array.from({ length: count }, (_, i) => addMonths(endMonth, i - count + 1));
  const [currencies, rows] = await Promise.all([
    db.getAllAsync<{ currency: CurrencyCode }>('SELECT DISTINCT currency FROM accounts WHERE archived = 0 ORDER BY currency'),
    db.getAllAsync<MonthSpending>(
      `SELECT l.month AS month, a.currency AS currency, SUM(-l.signed_minor) AS expenseMinor
       FROM ledger l
       JOIN accounts a ON a.id = l.account_id
       WHERE l.month BETWEEN ? AND ? AND a.archived = 0
         AND ((l.kind = 'tx' AND l.signed_minor < 0) OR l.kind = 'transfer_fee')
       GROUP BY l.month, a.currency`,
      months[0],
      endMonth,
    ),
  ]);
  return currencies.flatMap(({ currency }) =>
    months.map((month) => ({
      month,
      currency,
      expenseMinor: rows.find((r) => r.month === month && r.currency === currency)?.expenseMinor ?? 0,
    })),
  );
}
