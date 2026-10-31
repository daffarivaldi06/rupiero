import React from 'react';
import { View, TextInput, Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';
import { CURRENCIES, formatInputValue, parseAmount, type CurrencyCode } from '../domain/money';

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
  const { symbol, minorDigits } = CURRENCIES[currency];

  // Normalise to "1.234,56" once the user is done typing, if it parses.
  const handleBlur = () => {
    const minor = parseAmount(value, currency);
    if (minor !== null) onChangeText(formatInputValue(minor, currency));
  };

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={[styles.field, error && styles.fieldError]}>
        <Text style={styles.symbol}>{symbol}</Text>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={(text) => onChangeText(text.replace(/[^\d.,]/g, ''))}
          onBlur={handleBlur}
          placeholder={minorDigits > 0 ? '0,00' : '0'}
          placeholderTextColor={colors.textSecondary}
          keyboardType={minorDigits > 0 ? 'decimal-pad' : 'number-pad'}
          autoFocus={autoFocus}
          accessibilityLabel={label ? `${label} (${currency})` : `Nominal (${currency})`}
        />
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
  },
  label: {
    color: colors.textSecondary,
    fontSize: 14,
    marginBottom: 6,
    marginLeft: 4,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    minHeight: 52,
    paddingHorizontal: 16,
  },
  fieldError: {
    borderColor: colors.danger,
  },
  symbol: {
    color: colors.textSecondary,
    fontSize: 16,
    marginRight: 8,
  },
  input: {
    flex: 1,
    color: colors.text,
    fontSize: 16,
    paddingVertical: 12,
  },
  errorText: {
    color: colors.danger,
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
});
