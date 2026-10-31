import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, Text, Pressable } from 'react-native';
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
import { colors } from '../theme/colors';
import { RootStackParamList } from '../../App';

export default function TransactionFormScreen() {
  const db = useSQLiteContext();
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RootStackParamList, 'TransactionForm'>>();

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
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.sectionLabel}>Jenis Transaksi</Text>
      <View style={styles.typeSelector}>
        <Button
          title="Pengeluaran"
          variant={type === 'expense' ? 'danger' : 'outline'}
          onPress={() => !initialType && setType('expense')}
          style={{ flex: 1, marginRight: 5, opacity: initialType && type !== 'expense' ? 0.3 : 1 }}
        />
        <Button
          title="Pemasukan"
          variant={type === 'income' ? 'primary' : 'outline'}
          onPress={() => !initialType && setType('income')}
          style={{ flex: 1, marginLeft: 5, opacity: initialType && type !== 'income' ? 0.3 : 1 }}
        />
      </View>

      <Text style={styles.sectionLabel}>Akun</Text>
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
          label={`Nominal (${account.currency})`}
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
            <Text style={styles.scopedLabel}>Kategori</Text>
            <View style={styles.scopedBadge}>
                <Text style={styles.scopedText}>{lockedCategory?.name ?? '…'}</Text>
            </View>
        </View>
      ) : (
        <View style={{ marginBottom: 16 }}>
             <Text style={styles.sectionLabel}>Kategori</Text>
             <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={styles.catScroll}>
                {categories.map(cat => (
                    <Pressable
                        key={cat.id}
                        onPress={() => setCategoryId(cat.id)}
                        style={[
                            styles.catBadge,
                            categoryId === cat.id && { backgroundColor: colors.primary, borderColor: colors.primary }
                        ]}
                        accessibilityRole="radio"
                        accessibilityState={{ selected: categoryId === cat.id }}
                    >
                        <Text style={[styles.catBadgeText, categoryId === cat.id && { color: '#000' }]}>{cat.name}</Text>
                    </Pressable>
                ))}
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
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: colors.background,
  },
  sectionLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  typeSelector: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  saveButton: {
    marginTop: 20,
  },
  scopedCategoryRow: {
    marginVertical: 20,
    padding: 12,
    backgroundColor: colors.surface,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  scopedLabel: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  scopedBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
  },
  scopedText: {
    color: '#000',
    fontWeight: 'bold',
  },
  catScroll: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  catBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 8,
  },
  catBadgeText: {
    color: colors.text,
    fontSize: 13,
  },
});
