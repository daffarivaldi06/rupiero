import { useLayoutEffect } from 'react';
import { Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useBreakpoint } from '../theme/layout';

/**
 * For a stack screen with a desktop layout (ADR 0001): true on web from the `wide` breakpoint. While
 * true the stack header is hidden, because the screen shows DesktopHeader instead; it comes back when
 * the window narrows. Always false on native, where nothing changes.
 */
export function useDesktopLayout(): boolean {
  const navigation = useNavigation();
  const breakpoint = useBreakpoint();
  const wide = Platform.OS === 'web' && (breakpoint === 'wide' || breakpoint === 'xl');

  useLayoutEffect(() => {
    if (Platform.OS === 'web') navigation.setOptions({ headerShown: !wide });
  }, [navigation, wide]);

  return wide;
}
