import React, { useEffect } from 'react';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SQLiteProvider } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { Pressable, Text } from 'react-native';

import { initDb } from './src/db/database';
import { colors } from './src/theme/colors';

import DashboardScreen from './src/screens/DashboardScreen';
import TransactionFormScreen from './src/screens/TransactionFormScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import CategoryDetailScreen from './src/screens/CategoryDetailScreen';
import CategoryFormScreen from './src/screens/CategoryFormScreen';

export type RootStackParamList = {
  Dashboard: undefined;
  TransactionForm: { initialCategory?: string; initialType?: 'income' | 'expense' } | undefined;
  Settings: undefined;
  CategoryDetail: { category: string; categoryId: number };
  CategoryForm: { categoryId?: number; initialName?: string } | undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <SQLiteProvider databaseName="budget.db" onInit={initDb}>
      <NavigationContainer theme={DarkTheme}>
        <StatusBar style="light" />
        <Stack.Navigator
          screenOptions={{
            headerStyle: { backgroundColor: colors.background },
            headerTintColor: colors.text,
            headerShadowVisible: false,
            contentStyle: { backgroundColor: colors.background },
          }}
        >
          <Stack.Screen
            name="Dashboard"
            component={DashboardScreen}
            options={({ navigation }) => ({ 
              title: 'Budget App',
              headerRight: () => (
                <Pressable onPress={() => navigation.navigate('Settings')}>
                  <Text style={{ color: colors.primary, fontSize: 16, fontWeight: '500' }}>Settings</Text>
                </Pressable>
              ),
            })}
          />
          <Stack.Screen
            name="CategoryDetail"
            component={CategoryDetailScreen}
            options={{ title: 'Category Details' }}
          />
          <Stack.Screen
            name="CategoryForm"
            component={CategoryFormScreen}
            options={{ title: 'New Category', presentation: 'modal' }}
          />
          <Stack.Screen
            name="TransactionForm"
            component={TransactionFormScreen}
            options={{ title: 'Add Transaction', presentation: 'modal' }}
          />
          <Stack.Screen
            name="Settings"
            component={SettingsScreen}
            options={{ title: 'Settings' }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </SQLiteProvider>
  );
}
