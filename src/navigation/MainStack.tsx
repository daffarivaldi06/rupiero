import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { useTheme } from '../theme/ThemeProvider';
import { useI18n } from '../i18n/I18nProvider';
import AccountFormScreen from '../screens/AccountFormScreen';
import AccountsScreen from '../screens/AccountsScreen';
import BudgetFormScreen from '../screens/BudgetFormScreen';
import BudgetScreen from '../screens/BudgetScreen';
import CategoriesScreen from '../screens/CategoriesScreen';
import CategoryDetailScreen from '../screens/CategoryDetailScreen';
import CategoryFormScreen from '../screens/CategoryFormScreen';
import CategoryReassignScreen from '../screens/CategoryReassignScreen';
import DashboardScreen from '../screens/DashboardScreen';
import InsightsScreen from '../screens/InsightsScreen';
import RecurringFormScreen from '../screens/RecurringFormScreen';
import RecurringListScreen from '../screens/RecurringListScreen';
import SettingsScreen from '../screens/SettingsScreen';
import SubscriptionsScreen from '../screens/SubscriptionsScreen';
import TransactionListScreen from '../screens/TransactionListScreen';
import TransferFormScreen from '../screens/TransferFormScreen';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

/** Every screen of the app in one stack, shared by the native and the web root navigator. */
export function MainStack() {
  const theme = useTheme();
  const { color } = theme;
  const { t } = useI18n();

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: color.bg },
        headerTintColor: color.ink,
        headerShadowVisible: false,
        contentStyle: { backgroundColor: color.bg },
      }}
    >
      <Stack.Screen name="Dashboard" component={DashboardScreen} options={{ title: 'Rupiero', headerShown: false }} />
      {/* The screen sets its title to the category name once loaded. */}
      <Stack.Screen name="CategoryDetail" component={CategoryDetailScreen} options={{ title: '' }} />
      <Stack.Screen
        name="CategoryForm"
        component={CategoryFormScreen}
        options={({ route }) => ({
          title: t(route.params?.categoryId !== undefined ? 'nav.editCategory' : 'nav.newCategory'),
          presentation: 'modal',
        })}
      />
      <Stack.Screen
        name="CategoryReassign"
        component={CategoryReassignScreen}
        options={{ title: t('nav.reassign'), presentation: 'modal' }}
      />
      <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: t('nav.settings') }} />
      <Stack.Screen name="Accounts" component={AccountsScreen} options={{ title: t('nav.accounts') }} />
      <Stack.Screen name="Budget" component={BudgetScreen} options={{ title: t('nav.budget') }} />
      <Stack.Screen name="Insights" component={InsightsScreen} options={{ title: t('nav.insights') }} />
      <Stack.Screen name="Categories" component={CategoriesScreen} options={{ title: t('nav.categories') }} />
      <Stack.Screen name="Subscriptions" component={SubscriptionsScreen} options={{ title: t('nav.subscriptions') }} />
      <Stack.Screen name="Recurring" component={RecurringListScreen} options={{ title: t('nav.recurring') }} />
      <Stack.Screen
        name="RecurringForm"
        component={RecurringFormScreen}
        options={({ route }) => ({
          title: t(route.params?.ruleId !== undefined ? 'nav.editRecurring' : 'nav.newRecurring'),
          presentation: 'modal',
        })}
      />
      <Stack.Screen name="BudgetForm" component={BudgetFormScreen} options={{ title: t('nav.budget'), presentation: 'modal' }} />
      <Stack.Screen name="Transactions" component={TransactionListScreen} options={{ title: t('nav.transactions') }} />
      <Stack.Screen
        name="TransferForm"
        component={TransferFormScreen}
        options={({ route }) => ({
          title: t(route.params?.transferId !== undefined ? 'nav.editTransfer' : 'nav.transfer'),
          presentation: 'modal',
        })}
      />
      <Stack.Screen
        name="AccountForm"
        component={AccountFormScreen}
        options={({ route }) => ({
          title: t(route.params?.accountId !== undefined ? 'nav.editAccount' : 'nav.newAccount'),
          presentation: 'modal',
        })}
      />
    </Stack.Navigator>
  );
}
