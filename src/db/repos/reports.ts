import type { Month } from '../../domain/dates';
import type { CurrencyTotals } from '../../domain/types';
import type { Db, SQLParam } from '../client';

/**
 * Income and expense per currency for a month, optionally for one category. Currencies are never
 * mixed: each row sums only transactions on accounts of that currency. Every currency that has an
 * active account gets a row, even with no transactions.
 */
export async function getMonthSummary(
  db: Db,
  month: Month,
  options: { categoryId?: number } = {},
): Promise<CurrencyTotals[]> {
  const params: SQLParam[] = [month];
  let categoryClause = '';
  if (options.categoryId !== undefined) {
    categoryClause = 'AND t.category_id = ?';
    params.push(options.categoryId);
  }

  return db.getAllAsync<CurrencyTotals>(
    `SELECT a.currency AS currency,
            COALESCE(SUM(CASE WHEN t.type = 'income'  THEN t.amount_minor END), 0) AS incomeMinor,
            COALESCE(SUM(CASE WHEN t.type = 'expense' THEN t.amount_minor END), 0) AS expenseMinor
     FROM accounts a
     LEFT JOIN transactions t ON t.account_id = a.id AND t.month = ? ${categoryClause}
     WHERE a.archived = 0
     GROUP BY a.currency
     ORDER BY a.currency`,
    ...params,
  );
}
