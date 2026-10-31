import { createTestDb, type TestDb } from '../../../test/sqljs-db';
import { initDb } from '../init';
import { listAccounts } from '../repos/accounts';
import { createCategory } from '../repos/categories';
import { listLedger, type LedgerItem } from '../repos/ledger';
import { createTransaction } from '../repos/transactions';
import { createTransfer } from '../repos/transfers';

let db: TestDb;
let eur: number;
let idr: number;
let food: number;
let salary: number;

beforeEach(async () => {
  db = await createTestDb();
  await initDb(db, { seed: false });
  [eur, idr] = (await listAccounts(db)).map((a) => a.id);
  food = await createCategory(db, 'Makanan');
  salary = await createCategory(db, 'Gaji');
  await createTransaction(db, { accountId: eur, categoryId: salary, type: 'income', amountMinor: 185000, date: '2026-10-01' });
  await createTransaction(db, { accountId: eur, categoryId: food, type: 'expense', amountMinor: 1250, date: '2026-10-05', note: 'Roti' });
  await createTransfer(db, { fromAccountId: eur, toAccountId: idr, fromAmountMinor: 20000, toAmountMinor: 3_420_000, feeMinor: 150, date: '2026-10-10' });
  await createTransaction(db, { accountId: idr, categoryId: food, type: 'expense', amountMinor: 35_000, date: '2026-09-30' });
});
afterEach(() => db.close());

const brief = (items: LedgerItem[]) => items.map((i) => [i.kind, i.accountName, i.signedMinor, i.counterpartyName]);

describe('listLedger', () => {
  it('lists transactions, both sides of transfers and fees, newest first', async () => {
    expect(brief(await listLedger(db, { month: '2026-10' }))).toEqual([
      ['transfer_fee', 'Rekening EUR', -150, 'Rekening IDR'],
      ['transfer_in', 'Rekening IDR', 3_420_000, 'Rekening EUR'],
      ['transfer_out', 'Rekening EUR', -20000, 'Rekening IDR'],
      ['tx', 'Rekening EUR', -1250, null],
      ['tx', 'Rekening EUR', 185000, null],
    ]);
    const roti = (await listLedger(db, { month: '2026-10' }))[3];
    expect(roti).toMatchObject({ categoryName: 'Makanan', note: 'Roti', currency: 'EUR', date: '2026-10-05' });
  });

  it('filters by account, category and type', async () => {
    expect(brief(await listLedger(db, { accountId: idr }))).toEqual([
      ['transfer_in', 'Rekening IDR', 3_420_000, 'Rekening EUR'],
      ['tx', 'Rekening IDR', -35_000, null],
    ]);
    expect((await listLedger(db, { categoryId: food })).map((i) => i.signedMinor)).toEqual([-1250, -35_000]);
    expect((await listLedger(db, { type: 'income' })).map((i) => i.signedMinor)).toEqual([185000]);
    expect((await listLedger(db, { type: 'expense' })).map((i) => i.kind)).toEqual(['transfer_fee', 'tx', 'tx']);
    expect((await listLedger(db, { type: 'transfer' })).map((i) => i.kind)).toEqual(['transfer_fee', 'transfer_in', 'transfer_out']);
  });

  it('pages without gaps or overlaps', async () => {
    const all = await listLedger(db);
    const pages = [
      ...(await listLedger(db, { limit: 2, offset: 0 })),
      ...(await listLedger(db, { limit: 2, offset: 2 })),
      ...(await listLedger(db, { limit: 2, offset: 4 })),
    ];
    expect(all).toHaveLength(6);
    expect(pages).toEqual(all);
    expect(await listLedger(db, { limit: 2, offset: 6 })).toEqual([]);
  });
});
