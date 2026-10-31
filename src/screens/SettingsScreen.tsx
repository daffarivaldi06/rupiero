import React, { useState, useCallback } from 'react';
import { View, StyleSheet, Text, Alert, ScrollView } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { SHOW_DEV_TOOLS } from '../config/dev';
import { getUserVersion } from '../db/client';
import { resetDatabase } from '../db/init';
import { listAccountsWithBalance } from '../db/repos/accounts';
import { formatMoney } from '../domain/money';
import type { AccountWithBalance } from '../domain/types';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { colors } from '../theme/colors';
import { RootStackParamList } from '../../App';

export default function SettingsScreen() {
  const db = useSQLiteContext();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [accounts, setAccounts] = useState<AccountWithBalance[]>([]);
  const [schemaVersion, setSchemaVersion] = useState<number>();

  useFocusEffect(
    useCallback(() => {
      (async () => {
        setAccounts(await listAccountsWithBalance(db));
        setSchemaVersion(await getUserVersion(db));
      })().catch(console.error);
    }, [db])
  );

  const handleReset = (seed: boolean) => {
    Alert.alert(
      seed ? 'Reset & isi data contoh' : 'Reset ke kosong',
      'Semua data akan dihapus dan database dibuat ulang. Lanjutkan?',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            try {
              await resetDatabase(db, { seed });
              navigation.popToTop();
            } catch (e) {
              console.error(e);
              Alert.alert('Gagal', 'Database tidak dapat di-reset');
            }
          }
        }
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      <Card>
        <Text style={styles.sectionTitle}>Akun</Text>
        <Text style={styles.description}>
          Setiap akun memakai satu mata uang. Saldo tidak dikonversi antar mata uang.
        </Text>
        {accounts.map((account) => (
          <View key={account.id} style={styles.accountRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.accountName}>{account.name}</Text>
              <Text style={styles.accountCurrency}>{account.currency}</Text>
            </View>
            <Text style={styles.accountBalance}>{formatMoney(account.balanceMinor, account.currency)}</Text>
          </View>
        ))}
      </Card>

      {SHOW_DEV_TOOLS && (
        <Card style={{ marginTop: 16, borderColor: colors.danger, borderWidth: 1 }}>
          <Text style={[styles.sectionTitle, { color: colors.danger }]}>Alat Pengembang</Text>
          <Text style={styles.description}>
            Hanya tampil di build development. Skema database: v{schemaVersion ?? '?'}
          </Text>
          <Button title="Reset & isi data contoh" variant="danger" onPress={() => handleReset(true)} />
          <Button title="Reset ke kosong" variant="outline" onPress={() => handleReset(false)} />
        </Card>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  description: {
    color: colors.textSecondary,
    fontSize: 14,
    marginBottom: 20,
    lineHeight: 20,
  },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  accountName: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '500',
  },
  accountCurrency: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  accountBalance: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
});
