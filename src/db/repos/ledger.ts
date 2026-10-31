import type { LocalDate, Month } from '../../domain/dates';
import type { CurrencyCode } from '../../domain/money';
import type { Db, SQLParam } from '../client';

export type LedgerKind = 'tx' | 'transfer_out' | 'transfer_in' | 'transfer_fee';
export type LedgerTypeFilter = 'all' | 'income' | 'expense' | 'transfer';

/** One movement on one account: a transaction, either side of a transfer, or a transfer fee. */
export interface LedgerItem {
  kind: LedgerKind;
  /** transactions.id for 'tx', transfers.id otherwise. */
  id: number;
  accountId: number;
  accountName: string;
  currency: CurrencyCode;
  categoryId: number | null;
  categoryName: string | null;
  date: LocalDate;
  signedMinor: number;
  note: string;
  /** The other account of a transfer. */
  counterpartyName: string | null;
}

export interface LedgerFilter {
  month?: Month;
  accountId?: number;
  categoryId?: number;
  type?: LedgerTypeFilter;
  limit?: number;
  offset?: number;
}

interface LedgerRow {
  kind: LedgerKind;
  id: number;
  account_id: number;
  account_name: string;
  currency: CurrencyCode;
  category_id: number | null;
  category_name: string | null;
  date: string;
  signed_minor: number;
  note: string;
  counterparty_name: string | null;
}

const TYPE_CLAUSE: Record<Exclude<LedgerTypeFilter, 'all'>, string> = {
  income: "l.kind = 'tx' AND l.signed_minor > 0",
  // Fees are money spent, so they show with expenses (and with transfers).
  expense: "(l.kind = 'tx' AND l.signed_minor < 0) OR l.kind = 'transfer_fee'",
  transfer: "l.kind IN ('transfer_out', 'transfer_in', 'transfer_fee')",
};

/** Newest first, in pages. A stable order (date, id, kind) keeps pages from overlapping. */
export async function listLedger(db: Db, filter: LedgerFilter = {}): Promise<LedgerItem[]> {
  const where: string[] = [];
  const params: SQLParam[] = [];
  if (filter.month !== undefined) {
    where.push('l.month = ?');
    params.push(filter.month);
  }
  if (filter.accountId !== undefined) {
    where.push('l.account_id = ?');
    params.push(filter.accountId);
  }
  if (filter.categoryId !== undefined) {
    where.push('l.category_id = ?');
    params.push(filter.categoryId);
  }
  if (filter.type && filter.type !== 'all') where.push(`(${TYPE_CLAUSE[filter.type]})`);

  const rows = await db.getAllAsync<LedgerRow>(
    `SELECT l.kind, l.id, l.account_id, a.name AS account_name, a.currency,
            l.category_id, c.name AS category_name, l.date, l.signed_minor, l.note,
            CASE l.kind WHEN 'transfer_in' THEN fa.name WHEN 'tx' THEN NULL ELSE ta.name END AS counterparty_name
     FROM ledger l
     JOIN accounts a ON a.id = l.account_id
     LEFT JOIN categories c ON c.id = l.category_id
     LEFT JOIN transfers tr ON l.kind <> 'tx' AND tr.id = l.id
     LEFT JOIN accounts fa ON fa.id = tr.from_account_id
     LEFT JOIN accounts ta ON ta.id = tr.to_account_id
     ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
     ORDER BY l.date DESC, l.id DESC, l.kind
     LIMIT ? OFFSET ?`,
    ...params,
    filter.limit ?? 50,
    filter.offset ?? 0,
  );
  return rows.map((row) => ({
    kind: row.kind,
    id: row.id,
    accountId: row.account_id,
    accountName: row.account_name,
    currency: row.currency,
    categoryId: row.category_id,
    categoryName: row.category_name,
    date: row.date,
    signedMinor: row.signed_minor,
    note: row.note,
    counterpartyName: row.counterparty_name,
  }));
}
