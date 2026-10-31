import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, Pressable } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';

import { listAccounts } from '../db/repos/accounts';
import { listCategories } from '../db/repos/categories';
import { createTransaction } from '../db/repos/transactions';
import { todayLocal } from '../domain/dates';
import { parseAmount } from '../domain/money';
import type { Account, Category, TransactionType } from '../domain/types';
import { Input } from '../components/Input';
import { MoneyInput } from '../components/MoneyInput';
import { AccountPicker } from '../components/AccountPicker';
import { Button } from '../components/Button';
import { Txt } from '../components/Txt';
import { useThemedStyles, type Theme } from '../theme/ThemeProvider';
import type { RootStackParamList } from '../navigation/types';

export default function TransactionFormScreen() {
  const db = useSQLiteContext();
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RootStackParamList, 'TransactionForm'>>();
  const styles = useThemedStyles(makeStyles);

  const lockedCategoryId = route.params?.categoryId;
  const initialType = route.params?.initialType;

  const [type, setType] = useState<TransactionType>(initialType ?? 'expense');
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [account, setAccount] = useState<Account | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState<number | undefined>(lockedCategoryId);
  const [amountText, setAmountText] = useState('');
  const [note, setNote] = useState('');
  const [amountError, setAmountError] = useState<string>();

  useEffect(() => {
    (async () => {
      const [accs, cats] = await Promise.all([listAccounts(db), listCategories(db)]);
      setAccounts(accs);
      setAccount((current) => current ?? accs[0] ?? null);
      setCategories(cats);
    })().catch(console.error);
  }, [db]);

  const lockedCategory = categories.find((c) => c.id === lockedCategoryId);

  const handleSave = async () => {
    if (!account) {
      Alert.alert('Pilih akun', 'Pilih akun untuk transaksi ini');
      return;
    }
    const amountMinor = parseAmount(amountText, account.currency);
    if (amountMinor === null || amountMinor <= 0) {
      setAmountError('Masukkan nominal yang valid, mis. 12,50');
      return;
    }
    if (categoryId === undefined) {
      Alert.alert('Pilih kategori', 'Pilih kategori untuk transaksi ini');
      return;
    }

    try {
      await createTransaction(db, {
        accountId: account.id,
        categoryId,
        type,
        amountMinor,
        date: todayLocal(),
        note,
      });
      navigation.goBack();
    } catch (e) {
      console.error(e);
      Alert.alert('Gagal', 'Transaksi tidak dapat disimpan');
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Txt variant="label" tone="inkMuted" style={styles.sectionLabel}>Jenis transaksi</Txt>
      <View style={styles.typeSelector}>
        <Button
          title="Pengeluaran"
          variant={type === 'expense' ? 'danger' : 'outline'}
          onPress={() => !initialType && setType('expense')}
          style={[styles.typeButton, initialType && type !== 'expense' ? styles.locked : null]}
        />
        <Button
          title="Pemasukan"
          variant={type === 'income' ? 'income' : 'outline'}
          onPress={() => !initialType && setType('income')}
          style={[styles.typeButton, initialType && type !== 'income' ? styles.locked : null]}
        />
      </View>

      <Txt variant="label" tone="inkMuted" style={styles.sectionLabel}>Akun</Txt>
      <AccountPicker
        accounts={accounts}
        selectedId={account?.id ?? null}
        onSelect={(next) => {
          setAccount(next);
          setAmountError(undefined);
        }}
      />

      {account && (
        <MoneyInput
          label="Nominal"
          currency={account.currency}
          value={amountText}
          onChangeText={(text) => {
            setAmountText(text);
            setAmountError(undefined);
          }}
          error={amountError}
        />
      )}

      {lockedCategoryId !== undefined ? (
        <View style={styles.scopedCategoryRow}>
          <Txt variant="label" tone="inkMuted">Kategori</Txt>
          <Txt variant="bodyStrong">{lockedCategory?.name ?? '…'}</Txt>
        </View>
      ) : (
        <View style={styles.categoryBlock}>
          <Txt variant="label" tone="inkMuted" style={styles.sectionLabel}>Kategori</Txt>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {categories.map((cat) => {
              const selected = categoryId === cat.id;
              return (
                <Pressable
                  key={cat.id}
                  onPress={() => setCategoryId(cat.id)}
                  style={[styles.chip, selected && styles.chipSelected]}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                >
                  <Txt variant="label" tone={selected ? 'onInk' : 'ink'}>{cat.name}</Txt>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      )}

      <Input
        label="Catatan (opsional)"
        placeholder="Keterangan tambahan"
        value={note}
        onChangeText={setNote}
        multiline
      />

      <Button title="Simpan Transaksi" onPress={handleSave} style={styles.saveButton} />
    </ScrollView>
  );
}

const makeStyles = ({ color, radius, space }: Theme) =>
  StyleSheet.create({
    content: {
      padding: space.lg,
      paddingBottom: space.xxl,
    },
    sectionLabel: {
      marginBottom: space.xs,
    },
    typeSelector: {
      flexDirection: 'row',
      gap: space.md,
      marginBottom: space.md,
    },
    typeButton: {
      flex: 1,
    },
    locked: {
      opacity: 0.35,
    },
    scopedCategoryRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      minHeight: 48,
      marginVertical: space.sm,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderColor: color.line,
    },
    categoryBlock: {
      marginVertical: space.sm,
    },
    chip: {
      minHeight: 40,
      justifyContent: 'center',
      paddingHorizontal: space.md,
      borderRadius: radius.sm,
      borderWidth: 1,
      borderColor: color.lineStrong,
      marginRight: space.sm,
    },
    chipSelected: {
      backgroundColor: color.ink,
      borderColor: color.ink,
    },
    saveButton: {
      marginTop: space.lg,
    },
  });
