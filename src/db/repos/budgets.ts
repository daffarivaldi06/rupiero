import { addMonths, type Month } from '../../domain/dates';
import type { CurrencyCode } from '../../domain/money';
import type { Db } from '../client';

export interface BudgetKey {
  categoryId: number;
  month: Month;
  currency: CurrencyCode;
}

export interface BudgetLine extends BudgetKey {
  categoryName: string;
  limitMinor: number;
  /** The category's expenses this month on accounts in this currency (transfer fees excluded). */
  spentMinor: number;
}

/** Creates or replaces the limit for one category, month and currency. */
export async function setBudget(db: Db, budget: BudgetKey & { limitMinor: number }): Promise<void> {
  await db.runAsync(
    `INSERT INTO budgets (category_id, month, currency, limit_minor) VALUES (?, ?, ?, ?)
     ON CONFLICT (category_id, month, currency) DO UPDATE SET limit_minor = excluded.limit_minor`,
    budget.categoryId,
    budget.month,
    budget.currency,
    budget.limitMinor,
  );
}

export async function deleteBudget(db: Db, key: BudgetKey): Promise<void> {
  await db.runAsync(
    'DELETE FROM budgets WHERE category_id = ? AND month = ? AND currency = ?',
    key.categoryId,
    key.month,
    key.currency,
  );
}

const SELECT_LINES = `
  SELECT b.category_id AS categoryId, c.name AS categoryName, b.month, b.currency, b.limit_minor AS limitMinor,
         COALESCE((
           SELECT SUM(t.amount_minor)
           FROM transactions t JOIN accounts a ON a.id = t.account_id
           WHERE t.category_id = b.category_id AND t.month = b.month AND t.type = 'expense' AND a.currency = b.currency
         ), 0) AS spentMinor
  FROM budgets b
  JOIN categories c ON c.id = b.category_id`;

/** Every budget of the month with what has been spent against it, by category order then currency. */
export async function listBudgets(db: Db, month: Month): Promise<BudgetLine[]> {
  return db.getAllAsync<BudgetLine>(`${SELECT_LINES} WHERE b.month = ? ORDER BY c.sort_order, c.name, b.currency`, month);
}

export async function listCategoryBudgets(db: Db, categoryId: number, month: Month): Promise<BudgetLine[]> {
  return db.getAllAsync<BudgetLine>(`${SELECT_LINES} WHERE b.month = ? AND b.category_id = ? ORDER BY b.currency`, month, categoryId);
}

/** Copies last month's limits into `month`, keeping any already set. Returns how many were added. */
export async function copyBudgetsFromPreviousMonth(db: Db, month: Month): Promise<number> {
  const result = await db.runAsync(
    `INSERT OR IGNORE INTO budgets (category_id, month, currency, limit_minor)
     SELECT b.category_id, ?, b.currency, b.limit_minor
     FROM budgets b JOIN categories c ON c.id = b.category_id
     WHERE b.month = ? AND c.archived = 0`,
    month,
    addMonths(month, -1),
  );
  return result.changes;
}
