import { createTestDb, type TestDb } from '../../../test/sqljs-db';
import { convertMinor } from '../../domain/money';
import { initDb } from '../init';
import { createAccount, listAccounts, listAccountsWithBalance } from '../repos/accounts';
import { getLatestReferenceRate, getReferenceRateOn, saveReferenceRate } from '../repos/fxRates';
import {
  createTransfer,
  deleteTransfer,
  getTransfer,
  listTransfers,
  TransferError,
  transferRate,
  updateTransfer,
} from '../repos/transfers';

let db: TestDb;
let eur: number;
let idr: number;

beforeEach(async () => {
  db = await createTestDb();
  await initDb(db, { seed: false });
  [eur, idr] = (await listAccounts(db)).map((a) => a.id);
});
afterEach(() => db.close());

const balances = async () => Object.fromEntries((await listAccountsWithBalance(db)).map((a) => [a.name, a.balanceMinor]));

describe('transfers', () => {
  const eurToIdr = { fromAccountId: 0, toAccountId: 0, fromAmountMinor: 20000, toAmountMinor: 3_420_000, feeMinor: 150, date: '2026-10-30' };

  it('creates, reads, updates and deletes a cross-currency transfer', async () => {
    const id = await createTransfer(db, { ...eurToIdr, fromAccountId: eur, toAccountId: idr, note: ' Kirim ke rumah ' });
    expect(await getTransfer(db, id)).toMatchObject({
      fromAccountName: 'Rekening EUR',
      fromCurrency: 'EUR',
      toAccountName: 'Rekening IDR',
      toCurrency: 'IDR',
      feeMinor: 150,
      month: '2026-10',
      note: 'Kirim ke rumah',
    });
    expect(await balances()).toEqual({ 'Rekening EUR': -20150, 'Rekening IDR': 3_420_000 });

    await updateTransfer(db, id, { ...eurToIdr, fromAccountId: eur, toAccountId: idr, feeMinor: 0, toAmountMinor: 3_400_000 });
    expect(await balances()).toEqual({ 'Rekening EUR': -20000, 'Rekening IDR': 3_400_000 });

    await deleteTransfer(db, id);
    expect(await balances()).toEqual({ 'Rekening EUR': 0, 'Rekening IDR': 0 });
    expect(await getTransfer(db, id)).toBeNull();
  });

  it('derives the actual rate from the two amounts', async () => {
    const id = await createTransfer(db, { ...eurToIdr, fromAccountId: eur, toAccountId: idr });
    const rate = transferRate((await getTransfer(db, id))!);
    expect(convertMinor(100, rate)).toBe(17100); // 1 EUR = Rp 17.100
  });

  it('refuses a transfer to the same account', async () => {
    await expect(createTransfer(db, { ...eurToIdr, fromAccountId: eur, toAccountId: eur })).rejects.toThrow(TransferError);
  });

  it('requires equal amounts within one currency', async () => {
    const wallet = await createAccount(db, { name: 'Dompet', currency: 'IDR' });
    const same = { fromAccountId: idr, toAccountId: wallet, fromAmountMinor: 50_000, toAmountMinor: 49_000, date: '2026-10-30' };
    await expect(createTransfer(db, same)).rejects.toThrow(TransferError);
    await createTransfer(db, { ...same, toAmountMinor: 50_000, feeMinor: 2_500 });
    expect(await balances()).toEqual({ 'Rekening EUR': 0, 'Rekening IDR': -52_500, Dompet: 50_000 });
  });

  it('lists newest first and filters by month or either account', async () => {
    const wallet = await createAccount(db, { name: 'Dompet', currency: 'IDR' });
    await createTransfer(db, { ...eurToIdr, fromAccountId: eur, toAccountId: idr, date: '2026-09-30' });
    await createTransfer(db, { ...eurToIdr, fromAccountId: eur, toAccountId: idr, date: '2026-10-02' });
    await createTransfer(db, { fromAccountId: idr, toAccountId: wallet, fromAmountMinor: 1000, toAmountMinor: 1000, date: '2026-10-05' });

    expect((await listTransfers(db)).map((t) => t.date)).toEqual(['2026-10-05', '2026-10-02', '2026-09-30']);
    expect((await listTransfers(db, { month: '2026-10' })).map((t) => t.date)).toEqual(['2026-10-05', '2026-10-02']);
    expect((await listTransfers(db, { accountId: wallet })).map((t) => t.date)).toEqual(['2026-10-05']);
    expect((await listTransfers(db, { accountId: idr })).length).toBe(3);
  });
});

describe('fx rates', () => {
  it('returns null before any rate is stored', async () => {
    expect(await getLatestReferenceRate(db)).toBeNull();
    expect(await getReferenceRateOn(db, '2026-10-31')).toBeNull();
  });

  it('keeps one rate per date and picks the newest on or before a day', async () => {
    await saveReferenceRate(db, { date: '2026-10-29', rateMicro: 20_250_000_000 });
    await saveReferenceRate(db, { date: '2026-10-30', rateMicro: 20_200_000_000 });
    await saveReferenceRate(db, { date: '2026-10-30', rateMicro: 20_275_170_000 }); // refetch replaces

    expect(await getLatestReferenceRate(db)).toEqual({ date: '2026-10-30', rateMicro: 20_275_170_000 });
    expect(await getReferenceRateOn(db, '2026-11-01')).toEqual({ date: '2026-10-30', rateMicro: 20_275_170_000 }); // Sunday
    expect(await getReferenceRateOn(db, '2026-10-29')).toEqual({ date: '2026-10-29', rateMicro: 20_250_000_000 });
    expect(await getReferenceRateOn(db, '2026-10-28')).toBeNull();
    expect(await db.getFirstAsync('SELECT COUNT(*) AS n FROM fx_rates')).toEqual({ n: 2 });
  });

  it('only accepts positive integer EUR→IDR rates', async () => {
    await expect(saveReferenceRate(db, { date: '2026-10-30', rateMicro: 0 })).rejects.toThrow(RangeError);
    await expect(saveReferenceRate(db, { date: '2026-10-30', rateMicro: 20275.17 })).rejects.toThrow(RangeError);
    await saveReferenceRate(db, { date: '2026-10-30', rateMicro: 1 });
    expect(await db.getFirstAsync('SELECT base, quote FROM fx_rates')).toEqual({ base: 'EUR', quote: 'IDR' });
  });
});
