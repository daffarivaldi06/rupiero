import React, { useEffect, useRef, useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useHeaderHeight } from '@react-navigation/elements';
import { useTheme } from '../theme/ThemeProvider';
import { useReadableInset } from '../theme/layout';

interface FormScrollProps {
  children: React.ReactNode;
  contentContainerStyle?: StyleProp<ViewStyle>;
}

/**
 * Scrolling form body: stays clear of the keyboard, lets taps through to buttons while the keyboard is
 * open, and keeps a readable width on tablets.
 *
 * Android (edge-to-edge, Android 15+) no longer resizes the window for the keyboard, and
 * KeyboardAvoidingView there pushed forms up twice and kept the padding after the keyboard closed. So on
 * Android the scroll area simply ends at the keyboard's top edge while it is open, and the focused field
 * is scrolled into view.
 */
export function FormScroll({ children, contentContainerStyle }: FormScrollProps) {
  const { space } = useTheme();
  const inset = useReadableInset(space.xl);
  const headerHeight = useHeaderHeight();
  const scrollRef = useRef<ScrollView>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const show = Keyboard.addListener('keyboardDidShow', (event) => {
      setKeyboardHeight(event.endCoordinates.height);
      // After the scroll area has shrunk: bring the field being typed in above the keyboard.
      requestAnimationFrame(() => {
        const input = TextInput.State.currentlyFocusedInput();
        if (input) scrollRef.current?.scrollResponderScrollNativeHandleToKeyboard(input, headerHeight + space.lg, true);
      });
    });
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, [headerHeight, space.lg]);

  const scroll = (
    <ScrollView
      ref={scrollRef}
      style={styles.flex}
      contentContainerStyle={[contentContainerStyle, { paddingHorizontal: inset }]}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  );

  if (Platform.OS === 'android') {
    return <View style={[styles.flex, { paddingBottom: keyboardHeight }]}>{scroll}</View>;
  }
  return (
    <KeyboardAvoidingView style={styles.flex} behavior="padding" keyboardVerticalOffset={headerHeight}>
      {scroll}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
});
