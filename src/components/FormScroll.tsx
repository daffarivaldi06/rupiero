import React from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { useHeaderHeight } from '@react-navigation/elements';
import { useTheme } from '../theme/ThemeProvider';
import { useReadableInset } from '../theme/layout';

interface FormScrollProps {
  children: React.ReactNode;
  contentContainerStyle?: StyleProp<ViewStyle>;
}

/**
 * Scrolling form body: stays clear of the keyboard, lets taps through to buttons while the keyboard is
 * open, and keeps a readable width on tablets. Android already resizes the window for the keyboard
 * (windowSoftInputMode adjustResize); adding padding there too pushed the form up twice and left the
 * padding behind after the keyboard closed, so the avoiding view only acts on iOS.
 */
export function FormScroll({ children, contentContainerStyle }: FormScrollProps) {
  const { space } = useTheme();
  const inset = useReadableInset(space.xl);
  const headerHeight = useHeaderHeight();
  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      enabled={Platform.OS === 'ios'}
      keyboardVerticalOffset={headerHeight}
    >
      <ScrollView
        style={styles.flex}
        contentContainerStyle={[contentContainerStyle, { paddingHorizontal: inset }]}
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
});
