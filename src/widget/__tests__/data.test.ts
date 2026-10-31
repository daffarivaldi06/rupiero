import type React from 'react';
import { budgetWidgetRepresentation } from '../Widget';
import { createTestDb, type TestDb } from '../../../test/sqljs-db';
import { initDb } from '../../db/init';
import { listAccounts, setAccountArchived } from '../../db/repos/accounts';
import { setBudget } from '../../db/repos/budgets';
import { createCategory } from '../../db/repos/categories';
import { setHideBalances, setHideBalancesInWidget, setThemePreference } from '../../db/repos/settings';
import { createTransaction } from '../../db/repos/transactions';
import { widgetData } from '../data';

const NBSP = ' ';
const TODAY = '2026-10-31';

let db: TestDb;
let eur: number;
let idr: number;
let food: number;

beforeEach(async () => {
  db = await createTestDb();
  await initDb(db, { seed: false, locale: 'id', defaultCategories: false });
  [eur, idr] = (await listAccounts(db)).map((a) => a.id);
  food = await createCategory(db, 'Makanan');
  const salary = await createCategory(db, 'Gaji');
  await createTransaction(db, { accountId: eur, categoryId: salary, type: 'income', amountMinor: 185000, date: '2026-10-01' });
  await createTransaction(db, { accountId: eur, categoryId: food, type: 'expense', amountMinor: 17870, date: '2026-10-05' });
});
afterEach(() => db.close());

describe('widget theme', () => {
  it('draws light and dark for the launcher, or only the theme chosen in Settings', async () => {
    const both = budgetWidgetRepresentation(await widgetData(db, TODAY));
    expect(Object.keys(both)).toEqual(['light', 'dark']);

    await setThemePreference(db, 'dark');
    const data = await widgetData(db, TODAY);
    expect(data.theme).toBe('dark');
    const single = budgetWidgetRepresentation(data) as React.ReactElement<{ scheme: string }>;
    expect(single.props.scheme).toBe('dark');
  });
});

describe('widgetData', () => {
  it('shows balances per currency when no budget is set', async () => {
    expect(await widgetData(db, TODAY)).toEqual({
      theme: 'system',
      monthLabel: 'Oktober 2026',
      lines: [
        { currency: 'EUR', kind: 'balance', amount: `€${NBSP}1.671,30`, negative: false },
        { currency: 'IDR', kind: 'balance', amount: `Rp${NBSP}0`, negative: false },
      ],
      quickAdd: [
        { currency: 'EUR', accountId: eur },
        { currency: 'IDR', accountId: idr },
      ],
    });
  });

  it('shows what is left of this month’s budgets, the same figure as the budget screen', async () => {
    await setBudget(db, { categoryId: food, month: '2026-10', currency: 'EUR', limitMinor: 20000 });
    await setBudget(db, { categoryId: food, month: '2026-09', currency: 'IDR', limitMinor: 50_000 }); // other month
    const { lines } = await widgetData(db, TODAY);
    expect(lines[0]).toEqual({
      currency: 'EUR',
      kind: 'budget',
      amount: `€${NBSP}21,30`,
      negative: false,
      budget: { limit: `dari €${NBSP}200,00`, percent: 89, level: 'warning' },
    });
    expect(lines[1]).not.toHaveProperty('budget');
    expect(lines[1].kind).toBe('balance');
  });

  it('flags an overspent budget', async () => {
    await setBudget(db, { categoryId: food, month: '2026-10', currency: 'EUR', limitMinor: 10000 });
    expect((await widgetData(db, TODAY)).lines[0]).toEqual({
      currency: 'EUR',
      kind: 'budget',
      amount: `-€${NBSP}78,70`,
      negative: true,
      budget: { limit: `dari €${NBSP}100,00`, percent: 179, level: 'over' },
    });
  });

  it('sums several budgets in one currency', async () => {
    const fun = await createCategory(db, 'Hiburan');
    await setBudget(db, { categoryId: food, month: '2026-10', currency: 'EUR', limitMinor: 20000 });
    await setBudget(db, { categoryId: fun, month: '2026-10', currency: 'EUR', limitMinor: 10000 });
    expect((await widgetData(db, TODAY)).lines[0]).toMatchObject({
      amount: `€${NBSP}121,30`,
      budget: { limit: `dari €${NBSP}300,00`, percent: 60, level: 'ok' },
    });
  });

  it('keeps the bar but masks the limit when hidden', async () => {
    await setBudget(db, { categoryId: food, month: '2026-10', currency: 'EUR', limitMinor: 20000 });
    await setHideBalances(db, true);
    await setHideBalancesInWidget(db, true);
    expect((await widgetData(db, TODAY)).lines[0].budget).toEqual({ limit: `dari €${NBSP}••••`, percent: 89, level: 'warning' });
  });

  it('masks amounts only when the widget follows hidden balances', async () => {
    await setHideBalances(db, true);
    expect((await widgetData(db, TODAY)).lines[0].amount).toBe(`€${NBSP}1.671,30`);
    await setHideBalancesInWidget(db, true);
    expect((await widgetData(db, TODAY)).lines.map((l) => [l.amount, l.negative])).toEqual([
      [`€${NBSP}••••`, false],
      [`Rp${NBSP}••••`, false],
    ]);
  });

  it('offers quick-add only for currencies with an active account', async () => {
    await setAccountArchived(db, idr, true);
    const data = await widgetData(db, TODAY);
    expect(data.quickAdd).toEqual([{ currency: 'EUR', accountId: eur }]);
    expect(data.lines.map((l) => l.currency)).toEqual(['EUR']);
  });
});
