import React, { useState, useCallback } from 'react';
import { View, StyleSheet, Alert, ScrollView } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { SHOW_DEV_TOOLS } from '../config/dev';
import { getUserVersion } from '../db/client';
import { resetDatabase } from '../db/init';
import { listAccountsWithBalance } from '../db/repos/accounts';
import type { AccountWithBalance } from '../domain/types';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Money } from '../components/Money';
import { Txt } from '../components/Txt';
import { useThemedStyles, type Theme } from '../theme/ThemeProvider';
import { RootStackParamList } from '../../App';

export default function SettingsScreen() {
  const db = useSQLiteContext();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const styles = useThemedStyles(makeStyles);
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
    <ScrollView contentContainerStyle={styles.content}>
      <Txt variant="title">Akun</Txt>
      <Txt tone="inkMuted" style={styles.description}>
        Setiap akun memakai satu mata uang. Saldo tidak dikonversi antar mata uang.
      </Txt>
      <View style={styles.list}>
        {accounts.map((account) => (
          <View key={account.id} style={styles.accountRow}>
            <View style={styles.accountText}>
              <Txt variant="bodyStrong">{account.name}</Txt>
              <Txt variant="code" tone={account.currency === 'EUR' ? 'eur' : 'idrText'}>{account.currency}</Txt>
            </View>
            <Money minor={account.balanceMinor} currency={account.currency} variant="bodyStrong" />
          </View>
        ))}
      </View>

      {SHOW_DEV_TOOLS && (
        <Card style={styles.devCard}>
          <Txt variant="heading" tone="expense">Alat Pengembang</Txt>
          <Txt variant="caption" tone="inkMuted" style={styles.devDescription}>
            Hanya tampil di build development. Skema database: v{schemaVersion ?? '?'}
          </Txt>
          <Button title="Reset & isi data contoh" variant="danger" onPress={() => handleReset(true)} />
          <Button title="Reset ke kosong" variant="outline" onPress={() => handleReset(false)} />
        </Card>
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
      marginTop: space.xs,
      marginBottom: space.lg,
    },
    list: {
      borderTopWidth: 1,
      borderTopColor: color.ink,
    },
    accountRow: {
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: 56,
      paddingVertical: space.sm,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: color.line,
    },
    accountText: {
      flex: 1,
    },
    devCard: {
      marginTop: space.xxl,
      borderColor: color.expense,
      borderWidth: 1,
    },
    devDescription: {
      marginTop: space.xs,
      marginBottom: space.sm,
    },
  });
