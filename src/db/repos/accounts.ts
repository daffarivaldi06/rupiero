import type { CurrencyCode } from '../../domain/money';
import type { LocalDate } from '../../domain/dates';
import type { Account, AccountWithBalance, CurrencyBalance } from '../../domain/types';
import type { Db } from '../client';
import { notifyDataChanged } from '../events';

interface AccountRow {
  id: number;
  name: string;
  currency: CurrencyCode;
  opening_balance_minor: number;
  archived: number;
  sort_order: number;
}

const toAccount = (row: AccountRow): Account => ({
  id: row.id,
  name: row.name,
  currency: row.currency,
  openingBalanceMinor: row.opening_balance_minor,
  archived: row.archived === 1,
  sortOrder: row.sort_order,
});

const COLUMNS = 'a.id, a.name, a.currency, a.opening_balance_minor, a.archived, a.sort_order';

export async function listAccounts(db: Db, options: { includeArchived?: boolean } = {}): Promise<Account[]> {
  const rows = await db.getAllAsync<AccountRow>(
    `SELECT ${COLUMNS} FROM accounts a
     WHERE ? OR a.archived = 0
     ORDER BY a.sort_order, a.name`,
    options.includeArchived ? 1 : 0,
  );
  return rows.map(toAccount);
}

/** With `asOf`, only movements dated on or before that day count. */
export async function listAccountsWithBalance(
  db: Db,
  options: { includeArchived?: boolean; asOf?: LocalDate } = {},
): Promise<AccountWithBalance[]> {
  const asOf = options.asOf ?? null;
  const rows = await db.getAllAsync<AccountRow & { balance_minor: number }>(
    `SELECT ${COLUMNS},
            a.opening_balance_minor + COALESCE(SUM(l.signed_minor), 0) AS balance_minor
     FROM accounts a
     LEFT JOIN ledger l ON l.account_id = a.id AND (? IS NULL OR l.date <= ?)
     WHERE ? OR a.archived = 0
     GROUP BY a.id
     ORDER BY a.archived, a.sort_order, a.name`,
    asOf,
    asOf,
    options.includeArchived ? 1 : 0,
  );
  return rows.map((row) => ({ ...toAccount(row), balanceMinor: row.balance_minor }));
}

/**
 * Total balance per currency over active accounts (opening balance + ledger), never mixing
 * currencies. With `asOf`, only transactions dated on or before that day count.
 */
export async function getBalancesByCurrency(db: Db, options: { asOf?: LocalDate } = {}): Promise<CurrencyBalance[]> {
  const asOf = options.asOf ?? null;
  return db.getAllAsync<CurrencyBalance>(
    `SELECT currency, SUM(balance) AS balanceMinor
     FROM (
       SELECT a.currency,
              a.opening_balance_minor + COALESCE(SUM(l.signed_minor), 0) AS balance
       FROM accounts a
       LEFT JOIN ledger l ON l.account_id = a.id AND (? IS NULL OR l.date <= ?)
       WHERE a.archived = 0
       GROUP BY a.id
     )
     GROUP BY currency
     ORDER BY currency`,
    asOf,
    asOf,
  );
}

export async function getAccount(db: Db, id: number): Promise<Account | null> {
  const row = await db.getFirstAsync<AccountRow>(`SELECT ${COLUMNS} FROM accounts a WHERE a.id = ?`, id);
  return row ? toAccount(row) : null;
}

export interface NewAccount {
  name: string;
  currency: CurrencyCode;
  openingBalanceMinor?: number;
}

export async function createAccount(db: Db, account: NewAccount): Promise<number> {
  const result = await db.runAsync(
    `INSERT INTO accounts (name, currency, opening_balance_minor, sort_order)
     VALUES (?, ?, ?, (SELECT COALESCE(MAX(sort_order) + 1, 0) FROM accounts))`,
    account.name.trim(),
    account.currency,
    account.openingBalanceMinor ?? 0,
  );
  notifyDataChanged();
  return result.lastInsertRowId;
}

/** True once any transaction or transfer touches the account; its currency is then fixed. */
export async function accountHasActivity(db: Db, id: number): Promise<boolean> {
  const row = await db.getFirstAsync<{ used: number }>(
    `SELECT EXISTS (SELECT 1 FROM transactions WHERE account_id = ?)
         OR EXISTS (SELECT 1 FROM transfers WHERE from_account_id = ? OR to_account_id = ?) AS used`,
    id,
    id,
    id,
  );
  return row?.used === 1;
}

export class AccountCurrencyLockedError extends Error {
  constructor() {
    super('Mata uang akun yang sudah punya transaksi tidak bisa diganti');
    this.name = 'AccountCurrencyLockedError';
  }
}

/** Throws on a duplicate name, or on a currency change once the account has activity. */
export async function updateAccount(db: Db, id: number, account: NewAccount): Promise<void> {
  const current = await getAccount(db, id);
  if (!current) throw new Error(`Account ${id} not found`);
  if (current.currency !== account.currency && (await accountHasActivity(db, id))) {
    throw new AccountCurrencyLockedError();
  }
  await db.runAsync(
    'UPDATE accounts SET name = ?, currency = ?, opening_balance_minor = ? WHERE id = ?',
    account.name.trim(),
    account.currency,
    account.openingBalanceMinor ?? 0,
    id,
  );
  notifyDataChanged();
}

/** Archived accounts leave pickers and balances; their history stays. */
export async function setAccountArchived(db: Db, id: number, archived: boolean): Promise<void> {
  await db.runAsync('UPDATE accounts SET archived = ? WHERE id = ?', archived ? 1 : 0, id);
  notifyDataChanged();
}
