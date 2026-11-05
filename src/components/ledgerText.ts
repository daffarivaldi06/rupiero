import type { LedgerItem } from '../db/repos/ledger';
import { t } from '../i18n';

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
