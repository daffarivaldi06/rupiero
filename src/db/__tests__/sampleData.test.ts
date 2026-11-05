import { createTestDb, type TestDb } from '../../../test/sqljs-db';
import { onDataChanged } from '../events';
import { initDb } from '../init';
import { listAccounts } from '../repos/accounts';
import { dismissSampleData, loadSampleData, shouldOfferSampleData } from '../repos/sampleData';
import { createTransaction } from '../repos/transactions';
import { listCategories } from '../repos/categories';

let db: TestDb;
let notified: jest.Mock;
let unsubscribe: () => void;

const count = async (table: string) => (await db.getFirstAsync<{ n: number }>(`SELECT COUNT(*) AS n FROM ${table}`))!.n;

beforeEach(async () => {
  db = await createTestDb();
  // A first launch in a production build: defaults, no seed.
  await initDb(db, { seed: false, locale: 'en' });
  notified = jest.fn();
  unsubscribe = onDataChanged(notified);
});
afterEach(() => {
  unsubscribe();
  db.close();
});

it('is offered on a new, empty database', async () => {
  expect(await count('transactions')).toBe(0);
  expect(await shouldOfferSampleData(db)).toBe(true);
});

it('is not offered once something has been recorded', async () => {
  const [account] = await listAccounts(db);
  const [category] = await listCategories(db);
  await createTransaction(db, { accountId: account.id, categoryId: category.id, type: 'expense', amountMinor: 950, date: '2026-11-05', note: '' });
  expect(await shouldOfferSampleData(db)).toBe(false);
});

it('loads the development seed and is not offered again', async () => {
  await loadSampleData(db, { today: '2026-11-05', locale: 'en' });
  expect(await count('transactions')).toBeGreaterThan(30);
  expect((await listAccounts(db)).map((a) => a.currency).sort()).toEqual(['EUR', 'IDR', 'IDR']);
  expect(await shouldOfferSampleData(db)).toBe(false);
  expect(notified).toHaveBeenCalledTimes(1);
});

it('keeps the database empty when dismissed, and the offer stays gone', async () => {
  await dismissSampleData(db);
  expect(await count('transactions')).toBe(0);
  expect(await shouldOfferSampleData(db)).toBe(false);
  expect(notified).toHaveBeenCalledTimes(1);
});
