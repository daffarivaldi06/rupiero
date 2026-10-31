import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
// Gesture-handler's ScrollView so horizontal scrolling also works inside the bottom sheet.
import { ScrollView } from 'react-native-gesture-handler';
import { useThemedStyles, type Theme } from '../theme/ThemeProvider';
import type { Account } from '../domain/types';
import { Txt } from './Txt';

interface AccountPickerProps {
  accounts: Account[];
  selectedId: number | null;
  onSelect: (account: Account) => void;
}

export const AccountPicker: React.FC<AccountPickerProps> = ({ accounts, selectedId, onSelect }) => {
  const styles = useThemedStyles(makeStyles);
  return (
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
            <Txt variant="bodyStrong" tone={selected ? 'onInk' : 'ink'}>{account.name}</Txt>
            <Txt variant="code" tone={selected ? 'onInk' : account.currency === 'EUR' ? 'eur' : 'idrText'}>
              {account.currency}
            </Txt>
          </Pressable>
        );
      })}
    </ScrollView>
  );
};

const makeStyles = ({ color, radius, space }: Theme) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      marginBottom: space.sm,
    },
    chip: {
      minHeight: 48,
      justifyContent: 'center',
      paddingHorizontal: space.md,
      paddingVertical: space.xs,
      borderRadius: radius.sm,
      borderWidth: 1,
      borderColor: color.lineStrong,
      marginRight: space.sm,
    },
    chipSelected: {
      backgroundColor: color.ink,
      borderColor: color.ink,
    },
  });
