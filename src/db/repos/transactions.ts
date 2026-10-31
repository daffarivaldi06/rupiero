import type { LocalDate, Month } from '../../domain/dates';
import type { CurrencyCode } from '../../domain/money';
import type { TransactionDetail, TransactionType } from '../../domain/types';
import type { Db, SQLParam } from '../client';

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
