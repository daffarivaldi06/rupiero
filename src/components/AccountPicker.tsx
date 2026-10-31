import React from 'react';
import { ScrollView, Pressable, Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';
import type { Account } from '../domain/types';

interface AccountPickerProps {
  accounts: Account[];
  selectedId: number | null;
  onSelect: (account: Account) => void;
}

export const AccountPicker: React.FC<AccountPickerProps> = ({ accounts, selectedId, onSelect }) => (
  <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={styles.row}>
    {accounts.map((account) => {
      const selected = account.id === selectedId;
      return (
        <Pressable
          key={account.id}
          onPress={() => onSelect(account)}
          style={[styles.chip, selected && styles.chipSelected]}
          accessibilityRole="radio"
          accessibilityState={{ selected }}
          accessibilityLabel={`${account.name}, ${account.currency}`}
        >
          <Text style={[styles.name, selected && styles.textSelected]}>{account.name}</Text>
          <Text style={[styles.currency, selected && styles.textSelected]}>{account.currency}</Text>
        </Pressable>
      );
    })}
  </ScrollView>
);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 8,
  },
  chipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  name: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  currency: {
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  textSelected: {
    color: '#000',
  },
});
