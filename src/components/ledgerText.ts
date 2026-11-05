import type { LedgerItem } from '../db/repos/ledger';
import { t } from '../i18n';

/** The cells of one entry in the wide web transaction table (LedgerTable.web.tsx). */
export interface LedgerTableCells {
  /** The note, or what the entry is; null when a transaction has no note (shown as "—"). */
  description: string | null;
  /** A second, muted line under the description (a transfer's note, a fee's route). */
  detail?: string;
  category: string;
  account: string;
}

export function ledgerTableCells(item: LedgerItem): LedgerTableCells {
  switch (item.kind) {
    case 'tx':
      return { description: item.note || null, category: item.categoryName ?? '', account: item.accountName };
    case 'transfer_out':
      return {
        description: t('transactions.transferTo', { name: item.counterpartyName ?? '' }),
        detail: item.note || undefined,
        category: t('common.transfer'),
        account: item.accountName,
      };
    case 'transfer_in':
      return {
        description: t('transactions.transferFrom', { name: item.counterpartyName ?? '' }),
        detail: item.note || undefined,
        category: t('common.transfer'),
        account: item.accountName,
      };
    case 'transfer_fee':
      return {
        description: t('common.transferFee'),
        detail: `${item.accountName} → ${item.counterpartyName}`,
        category: t('common.transfer'),
        account: item.accountName,
      };
  }
}

/** Title and subtitle of a ledger row, the same in the transaction list and on the Dashboard. */
export function describeLedgerItem(item: LedgerItem): { title?: string; subtitle: string } {
  switch (item.kind) {
    case 'tx':
      return item.note
        ? { title: item.note, subtitle: t('transactions.subtitle', { category: item.categoryName ?? '', account: item.accountName }) }
        : { title: item.categoryName ?? undefined, subtitle: item.accountName };
    case 'transfer_out':
      return { title: t('transactions.transferTo', { name: item.counterpartyName ?? '' }), subtitle: item.note || item.accountName };
    case 'transfer_in':
      return { title: t('transactions.transferFrom', { name: item.counterpartyName ?? '' }), subtitle: item.note || item.accountName };
    case 'transfer_fee':
      return { title: t('common.transferFee'), subtitle: `${item.accountName} → ${item.counterpartyName}` };
  }
}
