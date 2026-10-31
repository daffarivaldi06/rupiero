import React from 'react';
import { View, TextInput, StyleSheet, TextInputProps } from 'react-native';
import { useTheme, useThemedStyles, type Theme } from '../theme/ThemeProvider';
import { textVariants } from '../theme/typography';
import { Txt } from './Txt';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
}

// Plain text input. Amounts go through MoneyInput instead.
export const Input: React.FC<InputProps> = ({ label, error, style, ...props }) => {
  const { color } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.container}>
      {label && <Txt variant="label" tone="inkMuted" style={styles.label}>{label}</Txt>}
      <TextInput
        style={[styles.input, error ? styles.inputError : null, style]}
        placeholderTextColor={color.inkMuted}
        accessibilityLabel={label}
        {...props}
      />
      {error && <Txt variant="caption" tone="expense" style={styles.errorText}>{error}</Txt>}
    </View>
  );
};

const makeStyles = ({ color, radius, space }: Theme) =>
  StyleSheet.create({
    container: {
      marginVertical: space.sm,
    },
    label: {
      marginBottom: space.xs,
    },
    input: {
      ...textVariants.body,
      color: color.ink,
      backgroundColor: color.surface,
      borderWidth: 1,
      borderColor: color.lineStrong,
      borderRadius: radius.sm,
      minHeight: 48,
      paddingHorizontal: space.md,
      paddingVertical: space.sm,
    },
    inputError: {
      borderColor: color.expense,
    },
    errorText: {
      marginTop: space.xs,
    },
  });
