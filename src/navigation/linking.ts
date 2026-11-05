import type { LinkingOptions, NavigatorScreenParams } from '@react-navigation/native';
import type { RootStackParamList } from './types';

/** On the web the stack sits inside the sidebar drawer, as its only screen. */
export type WebRootParamList = {
  Main: NavigatorScreenParams<RootStackParamList>;
};

// URLs are strings: ids come back as numbers so screens can compare them (month stays "YYYY-MM").
const id = Number;

/** Web URLs: one per sidebar section, and a path for every other screen so a reload lands on it. */
export const linking: LinkingOptions<WebRootParamList> = {
  prefixes: [],
  config: {
    screens: {
      Main: {
        // A deep link still has the Dashboard underneath, so back always has somewhere to go.
        initialRouteName: 'Dashboard',
        screens: {
          Dashboard: '',
          Transactions: { path: 'transactions', parse: { accountId: id, categoryId: id } },
          Budget: 'budget',
          Insights: 'charts',
          Settings: 'settings',
          Accounts: 'accounts',
          Categories: 'categories',
          Subscriptions: 'subscriptions',
          Recurring: 'recurring',
          CategoryDetail: { path: 'category', parse: { categoryId: id } },
          CategoryForm: { path: 'category-form', parse: { categoryId: id } },
          CategoryReassign: { path: 'category-reassign', parse: { categoryId: id } },
          RecurringForm: { path: 'recurring-form', parse: { ruleId: id } },
          BudgetForm: { path: 'budget-form', parse: { categoryId: id } },
          TransferForm: { path: 'transfer', parse: { transferId: id } },
          AccountForm: { path: 'account-form', parse: { accountId: id } },
        },
      },
    },
  },
};
