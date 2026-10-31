import { createTestDb, type TestDb } from '../../../test/sqljs-db';
import { initDb } from '../../db/init';
import { listAccounts } from '../../db/repos/accounts';
import { createCategory } from '../../db/repos/categories';
import { setHideBalances, setHideBalancesInWidget } from '../../db/repos/settings';
import { createTransaction } from '../../db/repos/transactions';
import { widgetAccountLines } from '../data';

let db: TestDb;
beforeEach(async () => {
  db = await initTestDb();
});
afterEach(() => db.close());

async function initTestDb() {
  const testDb = await createTestDb();
  await initDb(testDb, { seed: false });
  const [eur] = await listAccounts(testDb);
  const salary = await createCategory(testDb, 'Gaji');
  await createTransaction(testDb, { accountId: eur.id, categoryId: salary, type: 'income', amountMinor: 185000, date: '2026-10-01' });
  return testDb;
}

const NBSP = ' ';

describe('widgetAccountLines', () => {
  it('shows balances by default', async () => {
    expect(await widgetAccountLines(db)).toEqual([
      { name: 'Rekening EUR', balance: `€${NBSP}1.850,00` },
      { name: 'Rekening IDR', balance: `Rp${NBSP}0` },
    ]);
  });

  it('keeps showing them when only the app hides balances', async () => {
    await setHideBalances(db, true);
    expect((await widgetAccountLines(db))[0].balance).toBe(`€${NBSP}1.850,00`);
  });

  it('masks them when the widget follows the hidden state', async () => {
    await setHideBalances(db, true);
    await setHideBalancesInWidget(db, true);
    expect(await widgetAccountLines(db)).toEqual([
      { name: 'Rekening EUR', balance: `€${NBSP}••••` },
      { name: 'Rekening IDR', balance: `Rp${NBSP}••••` },
    ]);
  });

  it('shows them again once balances are visible in the app', async () => {
    await setHideBalancesInWidget(db, true);
    expect((await widgetAccountLines(db))[0].balance).toBe(`€${NBSP}1.850,00`);
  });
});
