import { createTestDb, type TestDb } from '../../../test/sqljs-db';
import { initDb } from '../init';
import { listAccounts, listAccountsWithBalance } from '../repos/accounts';
import { createCategory } from '../repos/categories';
import {
  createRecurringRule,
  deleteRecurringRule,
  getRecurringRule,
  listRecurringRules,
  materializeDue,
  setRecurringRulePaused,
  stopRecurringRule,
  updateRecurringRule,
  type NewRecurringRule,
} from '../repos/recurring';
import { listTransactions } from '../repos/transactions';

let db: TestDb;
let eur: number;
let rent: number;
let rentRule: NewRecurringRule;

beforeEach(async () => {
  db = await createTestDb();
  await initDb(db, { seed: false });
  eur = (await listAccounts(db))[0].id;
  rent = await createCategory(db, 'Sewa');
  rentRule = { accountId: eur, categoryId: rent, type: 'expense', amountMinor: 65000, note: 'Sewa', frequency: 'monthly', startDate: '2026-01-31' };
});
afterEach(() => db.close());

const dates = async () => (await listTransactions(db)).map((t) => t.date).sort();

describe('materializeDue', () => {
  it('creates every occurrence up to today, clamped to month ends, and none in the future', async () => {
    await createRecurringRule(db, rentRule);
    expect(await materializeDue(db, '2026-05-15')).toBe(4);
    expect(await dates()).toEqual(['2026-01-31', '2026-02-28', '2026-03-31', '2026-04-30']);
    const [tx] = await listTransactions(db);
    expect(tx).toMatchObject({ amountMinor: 65000, note: 'Sewa', categoryName: 'Sewa', type: 'expense' });
  });

  it('is idempotent', async () => {
    await createRecurringRule(db, rentRule);
    await materializeDue(db, '2026-05-15');
    expect(await materializeDue(db, '2026-05-15')).toBe(0);
    expect(await materializeDue(db, '2026-05-20')).toBe(0);
    expect(await dates()).toHaveLength(4);
    expect(await materializeDue(db, '2026-05-31')).toBe(1);
    expect(await dates()).toHaveLength(5);
  });

  it('does not recreate an occurrence the user deleted', async () => {
    await createRecurringRule(db, rentRule);
    await materializeDue(db, '2026-02-28');
    const [latest] = await listTransactions(db);
    await db.runAsync('DELETE FROM transactions WHERE id = ?', latest.id);
    await materializeDue(db, '2026-03-01');
    expect(await dates()).toEqual(['2026-01-31']);
  });

  it('generates daily rules with an interval', async () => {
    await createRecurringRule(db, { ...rentRule, frequency: 'daily', interval: 2, startDate: '2026-10-30', amountMinor: 500 });
    await materializeDue(db, '2026-11-03');
    expect(await dates()).toEqual(['2026-10-30', '2026-11-01', '2026-11-03']);
  });

  it('skips paused rules and stops at the end date', async () => {
    const paused = await createRecurringRule(db, { ...rentRule, startDate: '2026-10-01' });
    await setRecurringRulePaused(db, paused, true);
    const stopped = await createRecurringRule(db, { ...rentRule, startDate: '2026-08-15', amountMinor: 1000 });
    await materializeDue(db, '2026-09-01');
    await stopRecurringRule(db, stopped, '2026-09-20');
    await materializeDue(db, '2026-12-31');
    expect((await listTransactions(db)).map((t) => [t.date, t.amountMinor])).toEqual([
      ['2026-09-15', 1000],
      ['2026-08-15', 1000],
    ]);
  });

  it('pauses a rule stopped before it starts', async () => {
    const id = await createRecurringRule(db, { ...rentRule, startDate: '2026-12-01' });
    await stopRecurringRule(db, id, '2026-10-31');
    expect(await getRecurringRule(db, id)).toMatchObject({ paused: true, endDate: '2026-12-01' });
    await materializeDue(db, '2027-06-01');
    expect(await dates()).toEqual([]);
  });

  it('applies edits to future occurrences only', async () => {
    const id = await createRecurringRule(db, rentRule);
    await materializeDue(db, '2026-02-28');
    await updateRecurringRule(db, id, { ...rentRule, amountMinor: 70000 });
    await materializeDue(db, '2026-03-31');
    expect((await listTransactions(db)).map((t) => t.amountMinor)).toEqual([70000, 65000, 65000]);
  });

  it('keeps generated transactions when the rule is deleted', async () => {
    const id = await createRecurringRule(db, rentRule);
    await materializeDue(db, '2026-02-28');
    await deleteRecurringRule(db, id);
    expect(await dates()).toEqual(['2026-01-31', '2026-02-28']);
    expect((await listAccountsWithBalance(db))[0].balanceMinor).toBe(-130000);
  });
});

it('lists rules with account and category details', async () => {
  await createRecurringRule(db, rentRule);
  expect(await listRecurringRules(db)).toEqual([
    expect.objectContaining({
      accountName: 'Rekening EUR',
      currency: 'EUR',
      categoryName: 'Sewa',
      frequency: 'monthly',
      interval: 1,
      endDate: null,
      paused: false,
      lastGeneratedDate: null,
    }),
  ]);
});
