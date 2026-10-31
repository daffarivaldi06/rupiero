import { createTestDb, type TestDb } from '../../../test/sqljs-db';
import { decimalAmount, exportLedgerCsv } from '../csv';
import { initDb } from '../init';
import { listAccounts } from '../repos/accounts';
import { createCategory } from '../repos/categories';
import { createTransaction } from '../repos/transactions';
import { createTransfer } from '../repos/transfers';

let db: TestDb;
beforeEach(async () => {
  db = await createTestDb();
  await initDb(db, { seed: false });
});
afterEach(() => db.close());

it('formats amounts as plain signed decimals', () => {
  expect(decimalAmount(-1250, 'EUR')).toBe('-12.50');
  expect(decimalAmount(5, 'EUR')).toBe('0.05');
  expect(decimalAmount(185000, 'EUR')).toBe('1850.00');
  expect(decimalAmount(3_420_000, 'IDR')).toBe('3420000');
  expect(decimalAmount(-35_000, 'IDR')).toBe('-35000');
});

it('exports every movement oldest first, escaping text fields', async () => {
  const [eur, idr] = await listAccounts(db);
  const food = await createCategory(db, 'Makanan, minuman');
  await createTransaction(db, { accountId: eur.id, categoryId: food, type: 'expense', amountMinor: 1250, date: '2026-10-05', note: 'Roti "gandum"' });
  await createTransfer(db, { fromAccountId: eur.id, toAccountId: idr.id, fromAmountMinor: 20000, toAmountMinor: 3_420_000, feeMinor: 150, date: '2026-10-30' });

  const csv = await exportLedgerCsv(db);
  expect(csv.startsWith('﻿')).toBe(true);
  expect(csv.slice(1).split('\r\n')).toEqual([
    'Tanggal,Jenis,Akun,Mata uang,Kategori,Jumlah,Catatan,Akun lawan',
    '2026-10-05,Pengeluaran,Rekening EUR,EUR,"Makanan, minuman",-12.50,"Roti ""gandum""",',
    '2026-10-30,Transfer keluar,Rekening EUR,EUR,,-200.00,,Rekening IDR',
    '2026-10-30,Transfer masuk,Rekening IDR,IDR,,3420000,,Rekening EUR',
    '2026-10-30,Biaya transfer,Rekening EUR,EUR,,-1.50,,Rekening IDR',
    '',
  ]);
});
