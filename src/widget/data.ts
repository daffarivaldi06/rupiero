import type { Db } from '../db/client';
import { getBalancesByCurrency, listAccounts } from '../db/repos/accounts';
import { listBudgets } from '../db/repos/budgets';
import { getHideBalances, getHideBalancesInWidget } from '../db/repos/settings';
import { formatMonthLabel, monthOf, type LocalDate } from '../domain/dates';
import { formatMoneyDisplay, type CurrencyCode } from '../domain/money';

export interface WidgetLine {
  currency: CurrencyCode;
  /** What the amount is: left of this month's budgets, or the balance when the currency has none. */
  label: 'Sisa budget' | 'Saldo';
  /** Formatted, or masked while balances are hidden. */
  amount: string;
  negative: boolean;
}

export interface WidgetData {
  monthLabel: string;
  lines: WidgetLine[];
  /** One quick-add button per currency, for its first account. */
  quickAdd: { currency: CurrencyCode; accountId: number }[];
}

/**
 * What the widget shows for `today`: per currency, the remaining budget (total limits − spent in
 * budgeted categories), or the balance if no budget is set in that currency.
 */
export async function widgetData(db: Db, today: LocalDate): Promise<WidgetData> {
  const month = monthOf(today);
  const [balances, budgets, accounts, hideBalances, hideInWidget] = await Promise.all([
    getBalancesByCurrency(db),
    listBudgets(db, month),
    listAccounts(db),
    getHideBalances(db),
    getHideBalancesInWidget(db),
  ]);
  const hidden = hideBalances && hideInWidget;

  const lines = balances.map(({ currency, balanceMinor }): WidgetLine => {
    const ofCurrency = budgets.filter((b) => b.currency === currency);
    const value =
      ofCurrency.length > 0 ? ofCurrency.reduce((sum, b) => sum + b.limitMinor - b.spentMinor, 0) : balanceMinor;
    return {
      currency,
      label: ofCurrency.length > 0 ? 'Sisa budget' : 'Saldo',
      amount: formatMoneyDisplay(value, currency, { hidden }),
      negative: !hidden && value < 0,
    };
  });

  const quickAdd = balances.flatMap(({ currency }) => {
    const account = accounts.find((a) => a.currency === currency);
    return account ? [{ currency, accountId: account.id }] : [];
  });

  return { monthLabel: formatMonthLabel(month), lines, quickAdd };
}
