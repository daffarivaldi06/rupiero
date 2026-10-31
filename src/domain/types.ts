import type { LocalDate, Month } from './dates';
import type { CurrencyCode } from './money';

export type TransactionType = 'income' | 'expense';

export interface Account {
  id: number;
  name: string;
  currency: CurrencyCode;
  openingBalanceMinor: number;
  archived: boolean;
  sortOrder: number;
}

export interface AccountWithBalance extends Account {
  balanceMinor: number;
}

export interface Category {
  id: number;
  name: string;
  archived: boolean;
  sortOrder: number;
}

export interface Transaction {
  id: number;
  accountId: number;
  categoryId: number;
  type: TransactionType;
  amountMinor: number;
  date: LocalDate;
  month: Month;
  note: string;
}

/** A transaction joined with what the UI needs to show it. */
export interface TransactionDetail extends Transaction {
  accountName: string;
  currency: CurrencyCode;
  categoryName: string;
}

/** Income and expense of one currency over some period. */
export interface CurrencyTotals {
  currency: CurrencyCode;
  incomeMinor: number;
  expenseMinor: number;
}
