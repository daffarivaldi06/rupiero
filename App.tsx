import React from 'react';
import { SQLiteProvider } from 'expo-sqlite';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { DATABASE_NAME, initDb } from './src/db/init';
import { FxProvider } from './src/fx/FxProvider';
import { IntroProvider } from './src/intro/IntroProvider';
import { RootNavigator } from './src/navigation/RootNavigator';
import { ThemeProvider } from './src/theme/ThemeProvider';

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <IntroProvider>
          <SQLiteProvider databaseName={DATABASE_NAME} onInit={initDb}>
            <FxProvider>
              <RootNavigator />
            </FxProvider>
          </SQLiteProvider>
        </IntroProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
