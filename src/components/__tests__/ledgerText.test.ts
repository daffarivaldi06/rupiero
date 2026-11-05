import type { LedgerItem } from '../../db/repos/ledger';
import { describeLedgerItem, ledgerTableCells } from '../ledgerText';

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

describe('ledgerTableCells', () => {
  it('splits a transaction into note, category and account', () => {
    expect(ledgerTableCells({ ...base, note: 'Carrefour' })).toEqual({ description: 'Carrefour', category: 'Groceries', account: 'EUR account' });
  });

  it('leaves the description empty when a transaction has no note', () => {
    expect(ledgerTableCells(base).description).toBeNull();
  });

  it('keeps both sides of a transfer readable: direction, other account, own account', () => {
    const out = ledgerTableCells({ ...base, kind: 'transfer_out', categoryName: null, counterpartyName: 'IDR account', note: 'Tuition' });
    const into = ledgerTableCells({ ...base, kind: 'transfer_in', categoryName: null, accountName: 'IDR account', currency: 'IDR', counterpartyName: 'EUR account' });
    expect(out.description).toContain('IDR account');
    expect(out.detail).toBe('Tuition');
    expect(out.account).toBe('EUR account');
    expect(into.description).toContain('EUR account');
    expect(into.detail).toBeUndefined();
    expect(into.account).toBe('IDR account');
    expect(out.category).toBe(into.category);
  });

  it('shows a fee with its route', () => {
    const fee = ledgerTableCells({ ...base, kind: 'transfer_fee', categoryName: null, counterpartyName: 'IDR account' });
    expect(fee.detail).toBe('EUR account → IDR account');
    expect(fee.account).toBe('EUR account');
  });
});

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
