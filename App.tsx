import React from 'react';
import { StyleSheet } from 'react-native';
import { SQLiteProvider } from 'expo-sqlite';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { DATABASE_NAME, initDb } from './src/db/init';
import { FxProvider } from './src/fx/FxProvider';
import { IntroProvider } from './src/intro/IntroProvider';
import { RootNavigator } from './src/navigation/RootNavigator';
import { QuickAddProvider } from './src/quickadd/QuickAddProvider';
import { ThemeProvider } from './src/theme/ThemeProvider';

export default function App() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <ThemeProvider>
          <IntroProvider>
            <SQLiteProvider databaseName={DATABASE_NAME} onInit={initDb}>
              <FxProvider>
                <QuickAddProvider>
                  <RootNavigator />
                </QuickAddProvider>
              </FxProvider>
            </SQLiteProvider>
          </IntroProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
