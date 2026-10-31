import { createTestDb, type TestDb } from '../../../test/sqljs-db';
import { BackupError, exportBackup, importBackup, parseBackup, type BackupData } from '../backup';
import { getUserVersion } from '../client';
import { initDb } from '../init';
import { listAccounts, listAccountsWithBalance } from '../repos/accounts';
import { setBudget } from '../repos/budgets';
import { listCategories } from '../repos/categories';
import { saveReferenceRate } from '../repos/fxRates';
import { createRecurringRule, materializeDue } from '../repos/recurring';
import { createTransfer } from '../repos/transfers';

let source: TestDb;
let target: TestDb;

beforeEach(async () => {
  source = await createTestDb();
  await initDb(source, { seed: true });
  const [eur, idr] = await listAccounts(source);
  const [food] = await listCategories(source);
  await createTransfer(source, { fromAccountId: eur.id, toAccountId: idr.id, fromAmountMinor: 20000, toAmountMinor: 3_420_000, feeMinor: 150, date: '2026-10-30', note: 'Kirim' });
  await setBudget(source, { categoryId: food.id, month: '2026-10', currency: 'EUR', limitMinor: 30000 });
  await createRecurringRule(source, { accountId: eur.id, categoryId: food.id, type: 'expense', amountMinor: 999, frequency: 'daily', interval: 2, startDate: '2026-10-20', note: 'Kopi' });
  await materializeDue(source, '2026-10-31');
  await saveReferenceRate(source, { date: '2026-10-30', rateMicro: 20_275_170_000 });

  target = await createTestDb();
  await initDb(target, { seed: false });
});
afterEach(() => {
  source.close();
  target.close();
});

const withoutTimestamp = ({ exportedAt: _ignored, ...rest }: BackupData) => rest;

describe('backup', () => {
  it('round-trips: export → import → identical contents and balances', async () => {
    const exported = await exportBackup(source, new Date('2026-10-31T12:00:00Z'));
    const text = JSON.stringify(exported);
    await importBackup(target, parseBackup(text, await getUserVersion(target)));

    expect(withoutTimestamp(await exportBackup(target))).toEqual(withoutTimestamp(exported));
    expect(await listAccountsWithBalance(target)).toEqual(await listAccountsWithBalance(source));
    expect(exported.exportedAt).toBe('2026-10-31T12:00:00.000Z');
    expect(exported.transactions.length).toBeGreaterThan(50);
    expect(exported.recurring_rules).toHaveLength(1);
  });

  it('replaces whatever was there before', async () => {
    await importBackup(target, await exportBackup(source));
    await importBackup(source, await exportBackup(target));
    expect((await listAccounts(source)).length).toBe((await listAccounts(target)).length);
  });

  it('rejects files that are not a valid backup, with a clear message', () => {
    const version = 3;
    expect(() => parseBackup('{ nope', version)).toThrow('File bukan JSON yang valid.');
    expect(() => parseBackup('{"format":"other"}', version)).toThrow('File ini bukan backup Rupiero.');
    expect(() => parseBackup('{"format":"rupiero-backup","schemaVersion":9}', version)).toThrow(/versi Rupiero yang lebih baru/);
    expect(() => parseBackup('{"format":"rupiero-backup","schemaVersion":2}', version)).toThrow(/tidak didukung/);
    expect(() => parseBackup('{"format":"rupiero-backup","schemaVersion":3}', version)).toThrow(/Bagian "accounts" tidak ada/);
  });

  it('rejects rows with wrong types before touching the database', async () => {
    const exported = await exportBackup(source);
    const broken = { ...exported, transactions: [{ ...exported.transactions[0], amount_minor: '12,50' }] };
    expect(() => parseBackup(JSON.stringify(broken), 3)).toThrow(/"amount_minor" di baris 1 bagian "transactions"/);
    const badCurrency = { ...exported, accounts: [{ ...exported.accounts[0], currency: 'USD' }] };
    expect(() => parseBackup(JSON.stringify(badCurrency), 3)).toThrow(BackupError);
  });

  it('leaves the data untouched when the backup is inconsistent', async () => {
    const before = await exportBackup(target);
    const exported = await exportBackup(source);
    const orphan = { ...exported, transactions: [{ ...exported.transactions[0], account_id: 9999 }] };
    await expect(importBackup(target, parseBackup(JSON.stringify(orphan), 3))).rejects.toThrow(/tidak konsisten/);
    expect(withoutTimestamp(await exportBackup(target))).toEqual(withoutTimestamp(before));
  });
});
