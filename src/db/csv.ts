// Transactions as CSV for spreadsheets: one row per ledger movement, oldest first, amounts as plain
// signed decimals with a dot ("-12.50") so any spreadsheet locale can parse them.
import { CURRENCIES, type CurrencyCode } from '../domain/money';
import { t } from '../i18n';
import type { Db } from './client';
import { listLedger, type LedgerItem } from './repos/ledger';

// Headers and kinds follow the UI language; amounts and dates stay machine-readable.
const header = () => (['date', 'kind', 'account', 'currency', 'category', 'amount', 'note', 'counterparty'] as const).map((key) => t(`csv.${key}`));

const KIND = { transfer_out: 'csv.transferOut', transfer_in: 'csv.transferIn', transfer_fee: 'csv.transferFee' } as const;

/** -1250 EUR → "-12.50", 3420000 IDR → "3420000". */
export function decimalAmount(minor: number, currency: CurrencyCode): string {
  const digits = CURRENCIES[currency].minorDigits;
  const abs = Math.abs(minor);
  const sign = minor < 0 ? '-' : '';
  if (digits === 0) return `${sign}${abs}`;
  const unit = 10 ** digits;
  return `${sign}${Math.floor(abs / unit)}.${String(abs % unit).padStart(digits, '0')}`;
}

/** RFC 4180: quote fields with a comma, quote or line break, doubling inner quotes. */
const field = (value: string) => (/[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value);

export function ledgerCsv(items: LedgerItem[]): string {
  const rows = items.map((item) => [
    item.date,
    item.kind === 'tx' ? t(item.signedMinor > 0 ? 'csv.income' : 'csv.expense') : t(KIND[item.kind]),
    item.accountName,
    item.currency,
    item.categoryName ?? '',
    decimalAmount(item.signedMinor, item.currency),
    item.note,
    item.counterpartyName ?? '',
  ]);
  // The BOM makes Excel read the file as UTF-8 (€, accented names).
  return '﻿' + [header(), ...rows].map((row) => row.map(field).join(',')).join('\r\n') + '\r\n';
}

/** Every movement on every account, oldest first. */
export async function exportLedgerCsv(db: Db): Promise<string> {
  const items = await listLedger(db, { limit: Number.MAX_SAFE_INTEGER });
  return ledgerCsv(items.reverse());
}
