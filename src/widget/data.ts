import type { Db } from '../db/client';
import { getBalancesByCurrency, listAccounts } from '../db/repos/accounts';
import { listBudgets } from '../db/repos/budgets';
import { getHideBalances, getHideBalancesInWidget, getThemePreference } from '../db/repos/settings';
import type { ThemePreference } from '../theme/themePreference';
import { budgetStatus, type BudgetLevel } from '../domain/budget';
import { formatMonthLabel, monthOf, type LocalDate } from '../domain/dates';
import { formatMoneyDisplay, type CurrencyCode } from '../domain/money';
import { t } from '../i18n';

export interface WidgetLine {
  currency: CurrencyCode;
  /** What the amount is: left of this month's budgets, or the balance when the currency has none. */
  kind: 'budget' | 'balance';
  /** Formatted, or masked while balances are hidden. */
  amount: string;
  negative: boolean;
  /** Only for kind 'budget': spent against the summed limits, as in the budget screen. */
  budget?: {
    /** "dari € 300,00" / "of €300.00" (masked while balances are hidden). */
    limit: string;
    /** Whole percent spent; may exceed 100. */
    percent: number;
    level: BudgetLevel;
  };
}

export interface WidgetData {
  /** Settings → Theme: the widget follows the app's choice, not only the launcher's. */
  theme: ThemePreference;
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
  const [balances, budgets, accounts, hideBalances, hideInWidget, theme] = await Promise.all([
    getBalancesByCurrency(db),
    listBudgets(db, month),
    listAccounts(db),
    getHideBalances(db),
    getHideBalancesInWidget(db),
    getThemePreference(db),
  ]);
  const hidden = hideBalances && hideInWidget;

  const lines = balances.map(({ currency, balanceMinor }): WidgetLine => {
    const ofCurrency = budgets.filter((b) => b.currency === currency);
    if (ofCurrency.length === 0) {
      return {
        currency,
        kind: 'balance',
        amount: formatMoneyDisplay(balanceMinor, currency, { hidden }),
        negative: !hidden && balanceMinor < 0,
      };
    }
    const limitMinor = ofCurrency.reduce((sum, b) => sum + b.limitMinor, 0);
    const spentMinor = ofCurrency.reduce((sum, b) => sum + b.spentMinor, 0);
    const status = budgetStatus(spentMinor, limitMinor);
    return {
      currency,
      kind: 'budget',
      amount: formatMoneyDisplay(status.remainingMinor, currency, { hidden }),
      negative: !hidden && status.remainingMinor < 0,
      // Like the app's budget bars, the proportion stays visible when amounts are hidden.
      budget: {
        limit: t('widget.of', { limit: formatMoneyDisplay(limitMinor, currency, { hidden }) }),
        percent: status.percent,
        level: status.level,
      },
    };
  });

  const quickAdd = balances.flatMap(({ currency }) => {
    const account = accounts.find((a) => a.currency === currency);
    return account ? [{ currency, accountId: account.id }] : [];
  });

  return { theme, monthLabel: formatMonthLabel(month), lines, quickAdd };
}
