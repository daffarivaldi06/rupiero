import type { Month } from '../../domain/dates';
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
