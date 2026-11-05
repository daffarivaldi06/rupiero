import type React from 'react';
import type { BudgetLine } from '../../db/repos/budgets';
import type { LedgerItem } from '../../db/repos/ledger';
import type { CategoryCurrencyTotal } from '../../db/repos/reports';
import type { Month } from '../../domain/dates';
import type { ReferenceRate } from '../../domain/fx';
import type { CurrencyCode } from '../../domain/money';
import type { AccountWithBalance, Category, CurrencyBalance, CurrencyTotals } from '../../domain/types';
import type { RollSpec } from '../../components/countUp';

/** What the Dashboard has loaded, for the wide web layout (DashboardWide.web.tsx). */
export interface DashboardWideProps {
  /** Load error and sample data offer, shown first. */
  top: React.ReactNode;
  balanceLabel: string;
  balances: CurrencyBalance[];
  roll: RollSpec | null;
  baseCurrency: CurrencyCode;
  referenceRate: ReferenceRate | null;
  flowTitle: string;
  totals: CurrencyTotals[];
  recent: LedgerItem[];
  budgets: BudgetLine[];
  accounts: AccountWithBalance[];
  categories: Category[];
  categoryTotals: CategoryCurrencyTotal[];
  month: Month;
  isCurrentMonth: boolean;
}
