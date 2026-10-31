import React from 'react';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { DataProvider } from './src/data/DataProvider';
import { DatabaseProvider } from './src/db/DatabaseProvider';
import { FxProvider } from './src/fx/FxProvider';
import { ToastProvider } from './src/feedback/ToastProvider';
import { I18nProvider } from './src/i18n/I18nProvider';
import { IntroProvider } from './src/intro/IntroProvider';
import { RootNavigator } from './src/navigation/RootNavigator';
import { PrivacyProvider } from './src/privacy/PrivacyProvider';
import { QuickAddProvider } from './src/quickadd/QuickAddProvider';
import { ThemeProvider } from './src/theme/ThemeProvider';

export default function App() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <ThemeProvider>
          <IntroProvider>
            <DatabaseProvider>
              <I18nProvider>
                <ToastProvider>
                  <PrivacyProvider>
                    <DataProvider>
                      <FxProvider>
                        <QuickAddProvider>
                          <RootNavigator />
                        </QuickAddProvider>
                      </FxProvider>
                    </DataProvider>
                  </PrivacyProvider>
                </ToastProvider>
              </I18nProvider>
            </DatabaseProvider>
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
