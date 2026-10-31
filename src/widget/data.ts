import type { Db } from '../db/client';
import { listAccountsWithBalance } from '../db/repos/accounts';
import { getHideBalances, getHideBalancesInWidget } from '../db/repos/settings';
import { formatMoneyDisplay } from '../domain/money';
import type { WidgetAccountLine } from './Widget';

/** Account lines for the widget, masked when balances are hidden and the widget is set to follow. */
export async function widgetAccountLines(db: Db): Promise<WidgetAccountLine[]> {
  const [accounts, hideBalances, hideInWidget] = await Promise.all([
    listAccountsWithBalance(db),
    getHideBalances(db),
    getHideBalancesInWidget(db),
  ]);
  const hidden = hideBalances && hideInWidget;
  return accounts.map((a) => ({ name: a.name, balance: formatMoneyDisplay(a.balanceMinor, a.currency, { hidden }) }));
}
