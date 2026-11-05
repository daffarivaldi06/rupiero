// The native RootNavigator must register the same stack as before the MainStack extraction: same
// screens, same order, same components and options. Verifies the refactor without an Android build.
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { RootNavigator } from '../RootNavigator';
import AccountFormScreen from '../../screens/AccountFormScreen';
import AccountsScreen from '../../screens/AccountsScreen';
import BudgetFormScreen from '../../screens/BudgetFormScreen';
import BudgetScreen from '../../screens/BudgetScreen';
import CategoriesScreen from '../../screens/CategoriesScreen';
import CategoryDetailScreen from '../../screens/CategoryDetailScreen';
import CategoryFormScreen from '../../screens/CategoryFormScreen';
import CategoryReassignScreen from '../../screens/CategoryReassignScreen';
import DashboardScreen from '../../screens/DashboardScreen';
import InsightsScreen from '../../screens/InsightsScreen';
import RecurringFormScreen from '../../screens/RecurringFormScreen';
import RecurringListScreen from '../../screens/RecurringListScreen';
import SettingsScreen from '../../screens/SettingsScreen';
import SubscriptionsScreen from '../../screens/SubscriptionsScreen';
import TransactionListScreen from '../../screens/TransactionListScreen';
import TransferFormScreen from '../../screens/TransferFormScreen';

type Registered = { name: string; component: unknown; options: unknown };
const mockRegistered: Registered[] = [];

// Stand-ins that only record what the navigator registers.
jest.mock('@react-navigation/native-stack', () => ({
  createNativeStackNavigator: () => ({
    Navigator: ({ children }: { children: React.ReactNode }) => children,
    Screen: (props: Registered) => {
      mockRegistered.push(props);
      return null;
    },
  }),
}));
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  NavigationContainer: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock('expo-status-bar', () => ({ StatusBar: () => null }));
// Titles as message keys, so the check does not depend on the test machine's language.
jest.mock('../../i18n/I18nProvider', () => ({ useI18n: () => ({ t: (key: string) => key }) }));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/** Options as the stack would see them: option functions called without and with an id param. */
function resolvedOptions(options: unknown) {
  if (typeof options !== 'function') return options;
  return {
    new: options({ route: { params: undefined } }),
    edit: options({ route: { params: { categoryId: 1, ruleId: 1, transferId: 1, accountId: 1 } } }),
  };
}

it('registers the same 16 screens, in the same order, with the same components and options', () => {
  mockRegistered.length = 0;
  act(() => {
    TestRenderer.create(<RootNavigator />);
  });

  expect(mockRegistered.map((s) => s.name)).toEqual([
    'Dashboard',
    'CategoryDetail',
    'CategoryForm',
    'CategoryReassign',
    'Settings',
    'Accounts',
    'Budget',
    'Insights',
    'Categories',
    'Subscriptions',
    'Recurring',
    'RecurringForm',
    'BudgetForm',
    'Transactions',
    'TransferForm',
    'AccountForm',
  ]);

  expect(mockRegistered.map((s) => s.component)).toEqual([
    DashboardScreen,
    CategoryDetailScreen,
    CategoryFormScreen,
    CategoryReassignScreen,
    SettingsScreen,
    AccountsScreen,
    BudgetScreen,
    InsightsScreen,
    CategoriesScreen,
    SubscriptionsScreen,
    RecurringListScreen,
    RecurringFormScreen,
    BudgetFormScreen,
    TransactionListScreen,
    TransferFormScreen,
    AccountFormScreen,
  ]);

  expect(Object.fromEntries(mockRegistered.map((s) => [s.name, resolvedOptions(s.options)]))).toEqual({
    Dashboard: { title: 'Rupiero', headerShown: false },
    CategoryDetail: { title: '' },
    CategoryForm: { new: { title: 'nav.newCategory', presentation: 'modal' }, edit: { title: 'nav.editCategory', presentation: 'modal' } },
    CategoryReassign: { title: 'nav.reassign', presentation: 'modal' },
    Settings: { title: 'nav.settings' },
    Accounts: { title: 'nav.accounts' },
    Budget: { title: 'nav.budget' },
    Insights: { title: 'nav.insights' },
    Categories: { title: 'nav.categories' },
    Subscriptions: { title: 'nav.subscriptions' },
    Recurring: { title: 'nav.recurring' },
    RecurringForm: { new: { title: 'nav.newRecurring', presentation: 'modal' }, edit: { title: 'nav.editRecurring', presentation: 'modal' } },
    BudgetForm: { title: 'nav.budget', presentation: 'modal' },
    Transactions: { title: 'nav.transactions' },
    TransferForm: { new: { title: 'nav.transfer', presentation: 'modal' }, edit: { title: 'nav.editTransfer', presentation: 'modal' } },
    AccountForm: { new: { title: 'nav.newAccount', presentation: 'modal' }, edit: { title: 'nav.editAccount', presentation: 'modal' } },
  });
});
