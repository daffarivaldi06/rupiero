import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';

import { navigationTheme, useTheme } from '../theme/ThemeProvider';
import { MainStack } from './MainStack';

export function RootNavigator() {
  const theme = useTheme();

  return (
    <NavigationContainer theme={navigationTheme(theme)}>
      <StatusBar style="auto" />
      <MainStack />
    </NavigationContainer>
  );
}
