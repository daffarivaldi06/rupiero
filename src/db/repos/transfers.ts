import { t } from '../../i18n';
import type { LocalDate, Month } from '../../domain/dates';
import { impliedRate, type CurrencyCode, type ExchangeRate } from '../../domain/money';
import type { Db, SQLParam } from '../client';
import { notifyDataChanged } from '../events';

export interface Transfer {
  id: number;
  fromAccountId: number;
  toAccountId: number;
  /** Leaves the source account, in its currency. */
  fromAmountMinor: number;
  /** Arrives in the destination account, in its currency. */
  toAmountMinor: number;
  /** Charged to the source account on top of fromAmountMinor. */
  feeMinor: number;
  date: LocalDate;
  month: Month;
  note: string;
}

export interface TransferDetail extends Transfer {
  fromAccountName: string;
  fromCurrency: CurrencyCode;
  toAccountName: string;
  toCurrency: CurrencyCode;
}

interface TransferRow {
  id: number;
  from_account_id: number;
  to_account_id: number;
  from_amount_minor: number;
  to_amount_minor: number;
  fee_minor: number;
  date: string;
  month: string;
  note: string;
  from_account_name: string;
  from_currency: CurrencyCode;
  to_account_name: string;
  to_currency: CurrencyCode;
}

const toDetail = (row: TransferRow): TransferDetail => ({
  id: row.id,
  fromAccountId: row.from_account_id,
  toAccountId: row.to_account_id,
  fromAmountMinor: row.from_amount_minor,
  toAmountMinor: row.to_amount_minor,
  feeMinor: row.fee_minor,
  date: row.date,
  month: row.month,
  note: row.note,
  fromAccountName: row.from_account_name,
  fromCurrency: row.from_currency,
  toAccountName: row.to_account_name,
  toCurrency: row.to_currency,
});

const SELECT_DETAIL = `
  SELECT tr.id, tr.from_account_id, tr.to_account_id, tr.from_amount_minor, tr.to_amount_minor, tr.fee_minor,
         tr.date, tr.month, tr.note,
         fa.name AS from_account_name, fa.currency AS from_currency,
         ta.name AS to_account_name, ta.currency AS to_currency
  FROM transfers tr
  JOIN accounts fa ON fa.id = tr.from_account_id
  JOIN accounts ta ON ta.id = tr.to_account_id`;

export interface NewTransfer {
  fromAccountId: number;
  toAccountId: number;
  fromAmountMinor: number;
  toAmountMinor: number;
  feeMinor?: number;
  date: LocalDate;
  note?: string;
}

export class TransferError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TransferError';
  }
}

async function validate(db: Db, transfer: NewTransfer) {
  if (transfer.fromAccountId === transfer.toAccountId) {
    throw new TransferError(t('errors.sameAccount'));
  }
  const rows = await db.getAllAsync<{ id: number; currency: CurrencyCode }>(
    'SELECT id, currency FROM accounts WHERE id IN (?, ?)',
    transfer.fromAccountId,
    transfer.toAccountId,
  );
  const currency = (id: number) => rows.find((r) => r.id === id)?.currency;
  const from = currency(transfer.fromAccountId);
  const to = currency(transfer.toAccountId);
  if (!from || !to) throw new TransferError(t('errors.accountNotFound'));
  // Within one currency nothing is exchanged, so what leaves is what arrives.
  if (from === to && transfer.fromAmountMinor !== transfer.toAmountMinor) {
    throw new TransferError(t('errors.sameCurrencyAmounts'));
  }
}

export async function createTransfer(db: Db, transfer: NewTransfer): Promise<number> {
  await validate(db, transfer);
  const result = await db.runAsync(
    `INSERT INTO transfers (from_account_id, to_account_id, from_amount_minor, to_amount_minor, fee_minor, date, note)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    transfer.fromAccountId,
    transfer.toAccountId,
    transfer.fromAmountMinor,
    transfer.toAmountMinor,
    transfer.feeMinor ?? 0,
    transfer.date,
    transfer.note?.trim() ?? '',
  );
  notifyDataChanged();
  return result.lastInsertRowId;
}

export async function updateTransfer(db: Db, id: number, transfer: NewTransfer): Promise<void> {
  await validate(db, transfer);
  await db.runAsync(
    `UPDATE transfers
     SET from_account_id = ?, to_account_id = ?, from_amount_minor = ?, to_amount_minor = ?, fee_minor = ?, date = ?, note = ?
     WHERE id = ?`,
    transfer.fromAccountId,
    transfer.toAccountId,
    transfer.fromAmountMinor,
    transfer.toAmountMinor,
    transfer.feeMinor ?? 0,
    transfer.date,
    transfer.note?.trim() ?? '',
    id,
  );
  notifyDataChanged();
}

export async function deleteTransfer(db: Db, id: number): Promise<void> {
  await db.runAsync('DELETE FROM transfers WHERE id = ?', id);
  notifyDataChanged();
}

export async function getTransfer(db: Db, id: number): Promise<TransferDetail | null> {
  const row = await db.getFirstAsync<TransferRow>(`${SELECT_DETAIL} WHERE tr.id = ?`, id);
  return row ? toDetail(row) : null;
}

/** Newest first. `accountId` matches either side. */
export async function listTransfers(db: Db, filter: { month?: Month; accountId?: number } = {}): Promise<TransferDetail[]> {
  const where: string[] = [];
  const params: SQLParam[] = [];
  if (filter.month !== undefined) {
    where.push('tr.month = ?');
    params.push(filter.month);
  }
  if (filter.accountId !== undefined) {
    where.push('(tr.from_account_id = ? OR tr.to_account_id = ?)');
    params.push(filter.accountId, filter.accountId);
  }
  const rows = await db.getAllAsync<TransferRow>(
    `${SELECT_DETAIL} ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY tr.date DESC, tr.id DESC`,
    ...params,
  );
  return rows.map(toDetail);
}

/** The rate actually obtained: what arrived per what was sent (the fee is not part of it). */
export function transferRate(transfer: Pick<TransferDetail, 'fromAmountMinor' | 'fromCurrency' | 'toAmountMinor' | 'toCurrency'>): ExchangeRate {
  return impliedRate(transfer.fromAmountMinor, transfer.fromCurrency, transfer.toAmountMinor, transfer.toCurrency);
}
