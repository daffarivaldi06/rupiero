import React from 'react';
import { View, TextInput, StyleSheet } from 'react-native';
import { useTheme, useThemedStyles, type Theme } from '../theme/ThemeProvider';
import { textVariants } from '../theme/typography';
import { CURRENCIES, formatInputValue, parseAmount, type CurrencyCode } from '../domain/money';
import { Txt } from './Txt';

interface MoneyInputProps {
  label?: string;
  currency: CurrencyCode;
  /** Raw text as typed; parse it with parseAmount(value, currency) on save. */
  value: string;
  onChangeText: (text: string) => void;
  error?: string;
  autoFocus?: boolean;
}

export const MoneyInput: React.FC<MoneyInputProps> = ({ label, currency, value, onChangeText, error, autoFocus }) => {
  const { color } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { symbol, minorDigits } = CURRENCIES[currency];

  // Normalise to "1.234,56" once the user is done typing, if it parses.
  const handleBlur = () => {
    const minor = parseAmount(value, currency);
    if (minor !== null) onChangeText(formatInputValue(minor, currency));
  };

  return (
    <View style={styles.container}>
      {label && <Txt variant="label" tone="inkMuted" style={styles.label}>{label}</Txt>}
      <View style={[styles.field, error ? styles.fieldError : null]}>
        <Txt variant="title" tone="inkMuted" style={styles.symbol}>{symbol}</Txt>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={(text) => onChangeText(text.replace(/[^\d.,]/g, ''))}
          onBlur={handleBlur}
          placeholder={minorDigits > 0 ? '0,00' : '0'}
          placeholderTextColor={color.inkMuted}
          keyboardType={minorDigits > 0 ? 'decimal-pad' : 'number-pad'}
          autoFocus={autoFocus}
          accessibilityLabel={label ? `${label} (${currency})` : `Nominal (${currency})`}
        />
        <Txt variant="code" tone={currency === 'EUR' ? 'eur' : 'idrText'}>{currency}</Txt>
      </View>
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
    field: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: color.surface,
      borderWidth: 1,
      borderColor: color.lineStrong,
      borderRadius: radius.sm,
      minHeight: 56,
      paddingHorizontal: space.md,
    },
    fieldError: {
      borderColor: color.expense,
    },
    symbol: {
      marginRight: space.sm,
    },
    input: {
      ...textVariants.title,
      fontVariant: ['tabular-nums'],
      flex: 1,
      color: color.ink,
      paddingVertical: space.sm,
    },
    errorText: {
      marginTop: space.xs,
    },
  });
