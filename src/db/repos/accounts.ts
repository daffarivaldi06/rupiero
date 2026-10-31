import type { CurrencyCode } from '../../domain/money';
import type { Account, AccountWithBalance } from '../../domain/types';
import type { Db } from '../client';

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

export async function listAccountsWithBalance(db: Db): Promise<AccountWithBalance[]> {
  const rows = await db.getAllAsync<AccountRow & { balance_minor: number }>(
    `SELECT ${COLUMNS},
            a.opening_balance_minor + COALESCE(SUM(
              CASE t.type WHEN 'income' THEN t.amount_minor ELSE -t.amount_minor END
            ), 0) AS balance_minor
     FROM accounts a
     LEFT JOIN transactions t ON t.account_id = a.id
     WHERE a.archived = 0
     GROUP BY a.id
     ORDER BY a.sort_order, a.name`,
  );
  return rows.map((row) => ({ ...toAccount(row), balanceMinor: row.balance_minor }));
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
  return result.lastInsertRowId;
}
