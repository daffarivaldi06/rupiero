import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SQLiteProvider } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { DATABASE_NAME, initDb } from './src/db/init';
import { IntroProvider } from './src/intro/IntroProvider';
import { ThemeProvider, navigationTheme, useTheme } from './src/theme/ThemeProvider';
import type { TransactionType } from './src/domain/types';

import DashboardScreen from './src/screens/DashboardScreen';
import TransactionFormScreen from './src/screens/TransactionFormScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import CategoryDetailScreen from './src/screens/CategoryDetailScreen';
import CategoryFormScreen from './src/screens/CategoryFormScreen';

export type RootStackParamList = {
  Dashboard: undefined;
  TransactionForm: { categoryId?: number; initialType?: TransactionType } | undefined;
  Settings: undefined;
  CategoryDetail: { category: string; categoryId: number };
  CategoryForm: { categoryId?: number; initialName?: string } | undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <IntroProvider>
          <SQLiteProvider databaseName={DATABASE_NAME} onInit={initDb}>
            <RootNavigator />
          </SQLiteProvider>
        </IntroProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

function RootNavigator() {
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
        <Stack.Screen
          name="Dashboard"
          component={DashboardScreen}
          options={{ title: 'Rupiero', headerShown: false }}
        />
        <Stack.Screen
          name="CategoryDetail"
          component={CategoryDetailScreen}
          options={({ route }) => ({ title: route.params.category })}
        />
        <Stack.Screen
          name="CategoryForm"
          component={CategoryFormScreen}
          options={{ title: 'Kategori', presentation: 'modal' }}
        />
        <Stack.Screen
          name="TransactionForm"
          component={TransactionFormScreen}
          options={{ title: 'Tambah Transaksi', presentation: 'modal' }}
        />
        <Stack.Screen
          name="Settings"
          component={SettingsScreen}
          options={{ title: 'Pengaturan' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
