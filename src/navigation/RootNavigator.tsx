import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';

import { navigationTheme, useTheme } from '../theme/ThemeProvider';
import AccountFormScreen from '../screens/AccountFormScreen';
import AccountsScreen from '../screens/AccountsScreen';
import CategoryDetailScreen from '../screens/CategoryDetailScreen';
import CategoryFormScreen from '../screens/CategoryFormScreen';
import CategoryReassignScreen from '../screens/CategoryReassignScreen';
import DashboardScreen from '../screens/DashboardScreen';
import SettingsScreen from '../screens/SettingsScreen';
import TransactionListScreen from '../screens/TransactionListScreen';
import TransferFormScreen from '../screens/TransferFormScreen';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const theme = useTheme();
  const { color } = theme;

  return (
    <NavigationContainer theme={navigationTheme(theme)}>
      <StatusBar style="auto" />
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
            title: route.params?.categoryId !== undefined ? 'Ubah Kategori' : 'Kategori Baru',
            presentation: 'modal',
          })}
        />
        <Stack.Screen
          name="CategoryReassign"
          component={CategoryReassignScreen}
          options={{ title: 'Pindahkan transaksi', presentation: 'modal' }}
        />
        <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Pengaturan' }} />
        <Stack.Screen name="Accounts" component={AccountsScreen} options={{ title: 'Akun' }} />
        <Stack.Screen name="Transactions" component={TransactionListScreen} options={{ title: 'Transaksi' }} />
        <Stack.Screen
          name="TransferForm"
          component={TransferFormScreen}
          options={({ route }) => ({
            title: route.params?.transferId !== undefined ? 'Ubah Transfer' : 'Transfer',
            presentation: 'modal',
          })}
        />
        <Stack.Screen
          name="AccountForm"
          component={AccountFormScreen}
          options={({ route }) => ({
            title: route.params?.accountId !== undefined ? 'Ubah Akun' : 'Akun Baru',
            presentation: 'modal',
          })}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
