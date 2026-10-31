import React from 'react';
import { KeyboardAvoidingView, ScrollView, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { useHeaderHeight } from '@react-navigation/elements';
import { useTheme } from '../theme/ThemeProvider';
import { useReadableInset } from '../theme/layout';

interface FormScrollProps {
  children: React.ReactNode;
  contentContainerStyle?: StyleProp<ViewStyle>;
}

/**
 * Scrolling form body: moves up with the keyboard (edge-to-edge Android no longer resizes the window
 * for it), lets taps through to buttons while the keyboard is open, and keeps a readable width on tablets.
 */
export function FormScroll({ children, contentContainerStyle }: FormScrollProps) {
  const { space } = useTheme();
  const inset = useReadableInset(space.xl);
  const headerHeight = useHeaderHeight();
  return (
    <KeyboardAvoidingView style={styles.flex} behavior="padding" keyboardVerticalOffset={headerHeight}>
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
