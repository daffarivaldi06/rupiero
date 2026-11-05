import type { LedgerItem } from '../../db/repos/ledger';
import { describeLedgerItem } from '../ledgerText';

const base: LedgerItem = {
  kind: 'tx',
  id: 1,
  accountId: 1,
  accountName: 'EUR account',
  currency: 'EUR',
  categoryId: 2,
  categoryName: 'Groceries',
  date: '2026-11-05',
  signedMinor: -950,
  note: '',
  counterpartyName: null,
};

describe('describeLedgerItem', () => {
  it('titles a transaction by its note, with category and account below', () => {
    expect(describeLedgerItem({ ...base, note: 'Carrefour' })).toEqual({ title: 'Carrefour', subtitle: expect.stringContaining('Groceries') });
    expect(describeLedgerItem({ ...base, note: 'Carrefour' }).subtitle).toContain('EUR account');
  });

  it('titles a transaction without a note by its category', () => {
    expect(describeLedgerItem(base)).toEqual({ title: 'Groceries', subtitle: 'EUR account' });
  });

  it('names the other account of a transfer', () => {
    const out = describeLedgerItem({ ...base, kind: 'transfer_out', categoryName: null, counterpartyName: 'IDR account' });
    const into = describeLedgerItem({ ...base, kind: 'transfer_in', categoryName: null, counterpartyName: 'IDR account', note: 'Rent' });
    expect(out.title).toContain('IDR account');
    expect(out.subtitle).toBe('EUR account');
    expect(into.title).toContain('IDR account');
    expect(into.subtitle).toBe('Rent');
  });

  it('shows a fee with both accounts', () => {
    expect(describeLedgerItem({ ...base, kind: 'transfer_fee', counterpartyName: 'IDR account' }).subtitle).toBe('EUR account → IDR account');
  });
});
