import React, { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useFocusEffect, useNavigation } from '@react-navigation/native';

import { listAccountsWithBalance } from '../db/repos/accounts';
import type { AccountWithBalance } from '../domain/types';
import { Money } from '../components/Money';
import { Txt } from '../components/Txt';
import type { RootNavigation } from '../navigation/types';
import { useThemedStyles, type Theme } from '../theme/ThemeProvider';

export default function AccountsScreen() {
  const db = useSQLiteContext();
  const navigation = useNavigation<RootNavigation>();
  const styles = useThemedStyles(makeStyles);
  const [accounts, setAccounts] = useState<AccountWithBalance[]>([]);

  useFocusEffect(
    useCallback(() => {
      listAccountsWithBalance(db, { includeArchived: true }).then(setAccounts).catch(console.error);
    }, [db]),
  );

  const active = accounts.filter((a) => !a.archived);
  const archived = accounts.filter((a) => a.archived);

  const row = (account: AccountWithBalance) => (
    <Pressable
      key={account.id}
      onPress={() => navigation.navigate('AccountForm', { accountId: account.id })}
      style={styles.row}
      accessibilityRole="button"
    >
      <View style={styles.rowText}>
        <Txt variant="bodyStrong" tone={account.archived ? 'inkMuted' : 'ink'} numberOfLines={1}>{account.name}</Txt>
        <Txt variant="code" tone={account.currency === 'EUR' ? 'eur' : 'idrText'}>{account.currency}</Txt>
      </View>
      <Money
        minor={account.balanceMinor}
        currency={account.currency}
        variant="bodyStrong"
        tone={account.archived ? 'inkMuted' : account.balanceMinor < 0 ? 'expense' : 'neutral'}
      />
    </Pressable>
  );

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Txt tone="inkMuted" style={styles.description}>
        Setiap akun memakai satu mata uang. Saldo tidak dicampur antar mata uang.
      </Txt>
      <View style={styles.list}>
        {active.map(row)}
        <Pressable onPress={() => navigation.navigate('AccountForm')} style={styles.row} accessibilityRole="button">
          <Txt variant="bodyStrong">+ Tambah akun</Txt>
        </Pressable>
      </View>

      {archived.length > 0 && (
        <>
          <Txt variant="label" tone="inkMuted" style={styles.sectionLabel}>Diarsipkan</Txt>
          <View style={styles.list}>{archived.map(row)}</View>
        </>
      )}
    </ScrollView>
  );
}

const makeStyles = ({ color, space }: Theme) =>
  StyleSheet.create({
    content: {
      padding: space.lg,
      paddingBottom: space.xxl,
    },
    description: {
      marginBottom: space.lg,
    },
    sectionLabel: {
      marginTop: space.xl,
      marginBottom: space.xs,
    },
    list: {
      borderTopWidth: 1,
      borderTopColor: color.ink,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: 56,
      paddingVertical: space.sm,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: color.line,
    },
    rowText: {
      flex: 1,
      marginRight: space.md,
    },
  });
