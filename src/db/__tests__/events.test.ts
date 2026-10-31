import { createTestDb, type TestDb } from '../../../test/sqljs-db';
import { onDataChanged } from '../events';
import { initDb } from '../init';
import { listAccounts } from '../repos/accounts';
import { setBudget } from '../repos/budgets';
import { createCategory } from '../repos/categories';
import { createRecurringRule, materializeDue } from '../repos/recurring';
import { setHideBalances } from '../repos/settings';
import { createTransaction, deleteTransaction } from '../repos/transactions';
import { createTransfer } from '../repos/transfers';

let db: TestDb;
let changes: number;
let unsubscribe: () => void;

beforeEach(async () => {
  db = await createTestDb();
  await initDb(db, { seed: false });
  changes = 0;
  unsubscribe = onDataChanged(() => changes++);
});
afterEach(() => {
  unsubscribe();
  db.close();
});

it('fires once for every write', async () => {
  const [eur, idr] = await listAccounts(db);
  const food = await createCategory(db, 'Makanan');
  const tx = await createTransaction(db, { accountId: eur.id, categoryId: food, type: 'expense', amountMinor: 100, date: '2026-10-01' });
  await deleteTransaction(db, tx);
  await createTransfer(db, { fromAccountId: eur.id, toAccountId: idr.id, fromAmountMinor: 100, toAmountMinor: 20000, date: '2026-10-01' });
  await setBudget(db, { categoryId: food, month: '2026-10', currency: 'EUR', limitMinor: 1000 });
  await setHideBalances(db, true);
  expect(changes).toBe(6);
});

it('stays quiet when materializing creates nothing', async () => {
  const [eur] = await listAccounts(db);
  const food = await createCategory(db, 'Makanan');
  await createRecurringRule(db, { accountId: eur.id, categoryId: food, type: 'expense', amountMinor: 100, frequency: 'monthly', startDate: '2026-10-01' });
  changes = 0;
  expect(await materializeDue(db, '2026-10-15')).toBe(1);
  expect(changes).toBe(1);
  expect(await materializeDue(db, '2026-10-15')).toBe(0);
  expect(changes).toBe(1);
});

it('stops notifying after unsubscribe', async () => {
  unsubscribe();
  await createCategory(db, 'Lainnya');
  expect(changes).toBe(0);
});
