import type { LocalDate, Month } from '../../domain/dates';
import type { CurrencyCode } from '../../domain/money';
import { addDays } from '../../domain/dates';
import type { Category, TransactionDetail, TransactionType } from '../../domain/types';
import type { Db, SQLParam } from '../client';
import { notifyDataChanged } from '../events';

interface TransactionDetailRow {
  id: number;
  account_id: number;
  category_id: number;
  type: TransactionType;
  amount_minor: number;
  date: string;
  month: string;
  note: string;
  account_name: string;
  currency: CurrencyCode;
  category_name: string;
}

const toDetail = (row: TransactionDetailRow): TransactionDetail => ({
  id: row.id,
  accountId: row.account_id,
  categoryId: row.category_id,
  type: row.type,
  amountMinor: row.amount_minor,
  date: row.date,
  month: row.month,
  note: row.note,
  accountName: row.account_name,
  currency: row.currency,
  categoryName: row.category_name,
});

export interface NewTransaction {
  accountId: number;
  categoryId: number;
  type: TransactionType;
  amountMinor: number;
  date: LocalDate;
  note?: string;
}

export async function createTransaction(db: Db, tx: NewTransaction): Promise<number> {
  const result = await db.runAsync(
    `INSERT INTO transactions (account_id, category_id, type, amount_minor, date, note)
     VALUES (?, ?, ?, ?, ?, ?)`,
    tx.accountId,
    tx.categoryId,
    tx.type,
    tx.amountMinor,
    tx.date,
    tx.note?.trim() ?? '',
  );
  notifyDataChanged();
  return result.lastInsertRowId;
}

export interface TransactionFilter {
  month?: Month;
  categoryId?: number;
  accountId?: number;
}

/** Newest first. */
export async function listTransactions(db: Db, filter: TransactionFilter = {}): Promise<TransactionDetail[]> {
  const where: string[] = [];
  const params: SQLParam[] = [];
  if (filter.month !== undefined) {
    where.push('t.month = ?');
    params.push(filter.month);
  }
  if (filter.categoryId !== undefined) {
    where.push('t.category_id = ?');
    params.push(filter.categoryId);
  }
  if (filter.accountId !== undefined) {
    where.push('t.account_id = ?');
    params.push(filter.accountId);
  }

  const rows = await db.getAllAsync<TransactionDetailRow>(
    `SELECT t.id, t.account_id, t.category_id, t.type, t.amount_minor, t.date, t.month, t.note,
            a.name AS account_name, a.currency, c.name AS category_name
     FROM transactions t
     JOIN accounts a   ON a.id = t.account_id
     JOIN categories c ON c.id = t.category_id
     ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
     ORDER BY t.date DESC, t.id DESC`,
    ...params,
  );
  return rows.map(toDetail);
}

export async function getTransaction(db: Db, id: number): Promise<TransactionDetail | null> {
  const row = await db.getFirstAsync<TransactionDetailRow>(
    `SELECT t.id, t.account_id, t.category_id, t.type, t.amount_minor, t.date, t.month, t.note,
            a.name AS account_name, a.currency, c.name AS category_name
     FROM transactions t
     JOIN accounts a   ON a.id = t.account_id
     JOIN categories c ON c.id = t.category_id
     WHERE t.id = ?`,
    id,
  );
  return row ? toDetail(row) : null;
}

export async function updateTransaction(db: Db, id: number, tx: NewTransaction): Promise<void> {
  await db.runAsync(
    `UPDATE transactions
     SET account_id = ?, category_id = ?, type = ?, amount_minor = ?, date = ?, note = ?, updated_at = datetime('now')
     WHERE id = ?`,
    tx.accountId,
    tx.categoryId,
    tx.type,
    tx.amountMinor,
    tx.date,
    tx.note?.trim() ?? '',
    id,
  );
  notifyDataChanged();
}

/** A transaction row exactly as stored, so a delete can be undone without changing its id or links. */
export interface StoredTransaction {
  id: number;
  account_id: number;
  category_id: number;
  type: TransactionType;
  amount_minor: number;
  date: LocalDate;
  note: string;
  created_at: string;
  updated_at: string;
  recurring_rule_id: number | null;
}

/** Deletes and returns the row as it was (null if it did not exist), for undo. */
export async function deleteTransaction(db: Db, id: number): Promise<StoredTransaction | null> {
  const row = await db.getFirstAsync<StoredTransaction>(
    `SELECT id, account_id, category_id, type, amount_minor, date, note, created_at, updated_at, recurring_rule_id
     FROM transactions WHERE id = ?`,
    id,
  );
  await db.runAsync('DELETE FROM transactions WHERE id = ?', id);
  notifyDataChanged();
  return row;
}

/** Puts a deleted transaction back with the same id, timestamps and recurring-rule link. */
export async function restoreTransaction(db: Db, row: StoredTransaction): Promise<void> {
  await db.runAsync(
    `INSERT INTO transactions (id, account_id, category_id, type, amount_minor, date, note, created_at, updated_at, recurring_rule_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    row.id,
    row.account_id,
    row.category_id,
    row.type,
    row.amount_minor,
    row.date,
    row.note,
    row.created_at,
    row.updated_at,
    row.recurring_rule_id,
  );
  notifyDataChanged();
}

/**
 * Active categories ordered by how often they were used in the `days` up to `today` (inclusive),
 * then by their usual order, so a new user still gets a sensible list.
 */
export async function listCategoriesByUse(
  db: Db,
  { today, days = 90 }: { today: LocalDate; days?: number },
): Promise<Category[]> {
  const rows = await db.getAllAsync<{ id: number; name: string; archived: number; sort_order: number }>(
    `SELECT c.id, c.name, c.archived, c.sort_order
     FROM categories c
     LEFT JOIN transactions t ON t.category_id = c.id AND t.date > ? AND t.date <= ?
     WHERE c.archived = 0
     GROUP BY c.id
     ORDER BY COUNT(t.id) DESC, c.sort_order, c.name`,
    addDays(today, -days),
    today,
  );
  return rows.map((row) => ({ id: row.id, name: row.name, archived: row.archived === 1, sortOrder: row.sort_order }));
}
