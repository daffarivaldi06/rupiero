import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';

import { navigationTheme, useTheme } from '../theme/ThemeProvider';
import CategoryDetailScreen from '../screens/CategoryDetailScreen';
import CategoryFormScreen from '../screens/CategoryFormScreen';
import DashboardScreen from '../screens/DashboardScreen';
import SettingsScreen from '../screens/SettingsScreen';
import TransactionFormScreen from '../screens/TransactionFormScreen';
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
          name="TransactionForm"
          component={TransactionFormScreen}
          options={({ route }) => ({
            title:
              route.params?.initialType === 'income'
                ? 'Tambah Pemasukan'
                : route.params?.initialType === 'expense'
                  ? 'Tambah Pengeluaran'
                  : 'Tambah Transaksi',
            presentation: 'modal',
          })}
        />
        <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Pengaturan' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
