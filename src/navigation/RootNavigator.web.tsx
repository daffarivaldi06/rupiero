import React from 'react';
import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { StatusBar } from 'expo-status-bar';

import { useIntro } from '../intro/IntroProvider';
import { navigationTheme, useTheme } from '../theme/ThemeProvider';
import { useBreakpoint } from '../theme/layout';
import { linking, type WebRootParamList } from './linking';
import { MainStack } from './MainStack';
import { Sidebar } from './Sidebar.web';

const Drawer = createDrawerNavigator<WebRootParamList>();

/**
 * Web: the same stack as on Android, inside a drawer that is a permanent sidebar from the `wide`
 * breakpoint (ADR 0001), and URLs for every screen. Below it the drawer stays closed and empty, so
 * narrow windows look as before. The drawer stays mounted across breakpoints (only its type
 * changes), so resizing keeps the navigation state.
 */
export function RootNavigator() {
  const theme = useTheme();
  const breakpoint = useBreakpoint();
  const wide = breakpoint === 'wide' || breakpoint === 'xl';
  const navigationRef = useNavigationContainerRef<WebRootParamList>();
  const intro = useIntro();

  // The intro waits for the Dashboard to load, but a URL such as /budget opens another screen (the
  // Dashboard sits unfocused underneath): end the intro as soon as that screen is shown.
  const onReady = () => {
    if (navigationRef.getCurrentRoute()?.name !== 'Dashboard') intro.ready();
  };

  return (
    <NavigationContainer ref={navigationRef} theme={navigationTheme(theme)} linking={linking} onReady={onReady}>
      <StatusBar style="auto" />
      <Drawer.Navigator
        drawerContent={(props) => (wide ? <Sidebar {...props} /> : null)}
        screenOptions={{
          headerShown: false,
          drawerType: wide ? 'permanent' : 'front',
          swipeEnabled: false,
          overlayColor: 'transparent',
          drawerStyle: { width: theme.layout.sidebarWidth, backgroundColor: theme.color.bg },
        }}
      >
        <Drawer.Screen name="Main" component={MainStack} />
      </Drawer.Navigator>
    </NavigationContainer>
  );
}
