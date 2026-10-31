import React from 'react';
import { View, TextInput, Text, StyleSheet, TextInputProps } from 'react-native';
import { colors } from '../theme/colors';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  isCurrency?: boolean;
}

export const Input: React.FC<InputProps> = ({ label, error, isCurrency, value, onChangeText, ...props }) => {
  // Format the display value with commas if isCurrency is true
  const displayValue = isCurrency && value ? value.replace(/\B(?=(\d{3})+(?!\d))/g, ",") : value;

  const handleChangeText = (text: string) => {
    if (onChangeText) {
      if (isCurrency) {
        // Strip non-numeric characters for the raw value
        const numericText = text.replace(/[^0-9]/g, '');
        onChangeText(numericText);
      } else {
        onChangeText(text);
      }
    }
  };

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TextInput
        style={[styles.input, error && styles.inputError]}
        placeholderTextColor={colors.textSecondary}
        value={displayValue}
        onChangeText={handleChangeText}
        {...props}
      />
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
  input: {
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    height: 52,
    color: colors.text,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  inputError: {
    borderColor: colors.danger,
  },
  errorText: {
    color: colors.danger,
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
});
