import React, { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';

import { listAccounts } from '../db/repos/accounts';
import { listCategories } from '../db/repos/categories';
import {
  createRecurringRule,
  deleteRecurringRule,
  getRecurringRule,
  materializeDue,
  setRecurringRulePaused,
  stopRecurringRule,
  updateRecurringRule,
} from '../db/repos/recurring';
import { formatDateLabel, todayLocal, type LocalDate } from '../domain/dates';
import { formatInputValue, parseAmount } from '../domain/money';
import { describeFrequency, FREQUENCIES, nextDueDate, type Frequency } from '../domain/recurrence';
import type { Account, Category, TransactionType } from '../domain/types';
import { AccountPicker } from '../components/AccountPicker';
import { Button } from '../components/Button';
import { CategoryChips } from '../components/CategoryChips';
import { DateChip } from '../components/DateChip';
import { Input } from '../components/Input';
import { Txt } from '../components/Txt';
import type { RootNavigation, RootStackParamList } from '../navigation/types';
import { useThemedStyles, type Theme } from '../theme/ThemeProvider';

const FREQUENCY_LABEL: Record<Frequency, string> = { daily: 'Harian', weekly: 'Mingguan', monthly: 'Bulanan', yearly: 'Tahunan' };

export default function RecurringFormScreen() {
  const db = useSQLiteContext();
  const navigation = useNavigation<RootNavigation>();
  const route = useRoute<RouteProp<RootStackParamList, 'RecurringForm'>>();
  const styles = useThemedStyles(makeStyles);
  const ruleId = route.params?.ruleId;
  const isEditing = ruleId !== undefined;

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [type, setType] = useState<TransactionType>('expense');
  const [accountId, setAccountId] = useState<number | null>(null);
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [amount, setAmount] = useState('');
  const [frequency, setFrequency] = useState<Frequency>('monthly');
  const [intervalText, setIntervalText] = useState('1');
  const [startDate, setStartDate] = useState<LocalDate>(todayLocal());
  const [endDate, setEndDate] = useState<LocalDate | null>(null);
  const [note, setNote] = useState('');
  const [paused, setPaused] = useState(false);
  const [lastGeneratedDate, setLastGeneratedDate] = useState<LocalDate | null>(null);

  useEffect(() => {
    (async () => {
      const [nextAccounts, nextCategories] = await Promise.all([listAccounts(db), listCategories(db)]);
      setAccounts(nextAccounts);
      setCategories(nextCategories);
      if (ruleId === undefined) {
        setAccountId(nextAccounts[0]?.id ?? null);
        return;
      }
      const rule = await getRecurringRule(db, ruleId);
      if (!rule) return;
      setType(rule.type);
      setAccountId(rule.accountId);
      setCategoryId(rule.categoryId);
      setAmount(formatInputValue(rule.amountMinor, rule.currency));
      setFrequency(rule.frequency);
      setIntervalText(String(rule.interval));
      setStartDate(rule.startDate);
      setEndDate(rule.endDate);
      setNote(rule.note);
      setPaused(rule.paused);
      setLastGeneratedDate(rule.lastGeneratedDate);
    })().catch(console.error);
  }, [db, ruleId]);

  const account = accounts.find((a) => a.id === accountId) ?? null;
  const intervalCount = Number(intervalText);
  const intervalValid = Number.isInteger(intervalCount) && intervalCount >= 1 && intervalCount <= 365;
  const next = intervalValid
    ? nextDueDate({ frequency, interval: intervalCount, startDate, endDate, paused, lastGeneratedDate }, todayLocal())
    : null;

  const finish = async () => {
    await materializeDue(db, todayLocal());
    navigation.goBack();
  };

  const save = async () => {
    const amountMinor = account ? parseAmount(amount, account.currency) : null;
    if (!account || categoryId === null) {
      Alert.alert('Belum lengkap', 'Pilih akun dan kategori');
      return;
    }
    if (!amountMinor || amountMinor <= 0) {
      Alert.alert('Nominal belum valid', account.currency === 'EUR' ? 'Contoh: 9,99' : 'Contoh: 150.000');
      return;
    }
    if (!intervalValid) {
      Alert.alert('Interval belum valid', 'Isi angka 1–365');
      return;
    }
    if (endDate !== null && endDate < startDate) {
      Alert.alert('Tanggal akhir', 'Tanggal akhir tidak boleh sebelum tanggal mulai');
      return;
    }
    const rule = { accountId: account.id, categoryId, type, amountMinor, note, frequency, interval: intervalCount, startDate, endDate };
    try {
      if (isEditing) await updateRecurringRule(db, ruleId, rule);
      else await createRecurringRule(db, rule);
      await finish();
    } catch (e) {
      console.error(e);
      Alert.alert('Gagal', 'Aturan tidak dapat disimpan');
    }
  };

  const run = (action: () => Promise<void>) => async () => {
    try {
      await action();
      await finish();
    } catch (e) {
      console.error(e);
      Alert.alert('Gagal', 'Aturan tidak dapat diubah');
    }
  };

  const confirmDelete = () =>
    Alert.alert('Hapus aturan', 'Transaksi yang sudah tercatat tetap ada. Hanya kemunculan berikutnya yang tidak dibuat.', [
      { text: 'Batal', style: 'cancel' },
      { text: 'Hapus', style: 'destructive', onPress: run(() => deleteRecurringRule(db, ruleId!)) },
    ]);

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.chipRow}>
        {(['expense', 'income'] as const).map((value) => {
          const selected = type === value;
          return (
            <Pressable
              key={value}
              onPress={() => setType(value)}
              style={[styles.typeButton, selected && (value === 'expense' ? styles.expenseSelected : styles.incomeSelected)]}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
            >
              <Txt variant="bodyStrong" tone={selected ? (value === 'expense' ? 'onExpense' : 'onIncome') : 'ink'}>
                {value === 'expense' ? 'Pengeluaran' : 'Pemasukan'}
              </Txt>
            </Pressable>
          );
        })}
      </View>

      <Txt variant="label" tone="inkMuted" style={styles.label}>Akun</Txt>
      <AccountPicker accounts={accounts} selectedId={accountId} onSelect={(a) => setAccountId(a.id)} />

      {account && (
        <Input
          label={`Nominal (${account.currency})`}
          placeholder={account.currency === 'EUR' ? '9,99' : '150.000'}
          value={amount}
          onChangeText={setAmount}
          keyboardType={account.currency === 'EUR' ? 'decimal-pad' : 'number-pad'}
        />
      )}

      <Txt variant="label" tone="inkMuted" style={styles.label}>Kategori</Txt>
      <CategoryChips categories={categories} selectedId={categoryId} onSelect={setCategoryId} />

      <Txt variant="label" tone="inkMuted" style={styles.label}>Frekuensi</Txt>
      <View style={styles.chipRow}>
        {FREQUENCIES.map((value) => {
          const selected = frequency === value;
          return (
            <Pressable
              key={value}
              onPress={() => setFrequency(value)}
              style={[styles.chip, selected && styles.chipSelected]}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
            >
              <Txt variant="label" tone={selected ? 'onInk' : 'ink'}>{FREQUENCY_LABEL[value]}</Txt>
            </Pressable>
          );
        })}
      </View>
      <Input
        label="Setiap berapa (interval)"
        value={intervalText}
        onChangeText={setIntervalText}
        keyboardType="number-pad"
        error={intervalValid ? undefined : 'Isi angka 1–365'}
      />
      {intervalValid && <Txt variant="caption" tone="inkMuted">{describeFrequency(frequency, intervalCount)}</Txt>}

      <View style={styles.dates}>
        <View style={styles.dateField}>
          <Txt variant="label" tone="inkMuted" style={styles.label}>Mulai</Txt>
          <DateChip value={startDate} onChange={setStartDate} accessibilityLabel="Tanggal mulai" />
        </View>
        <View style={styles.dateField}>
          <Txt variant="label" tone="inkMuted" style={styles.label}>Berakhir</Txt>
          <View style={styles.endRow}>
            <DateChip value={endDate} onChange={setEndDate} placeholder="Tanpa akhir" accessibilityLabel="Tanggal berakhir" minimumDate={startDate} />
            {endDate !== null && (
              <Pressable onPress={() => setEndDate(null)} style={styles.clear} accessibilityRole="button" accessibilityLabel="Hapus tanggal berakhir">
                <Txt tone="inkMuted">✕</Txt>
              </Pressable>
            )}
          </View>
        </View>
      </View>

      <Input label="Catatan (mis. Spotify, Sewa)" value={note} onChangeText={setNote} />

      <Txt variant="caption" tone="inkMuted" style={styles.next}>
        {paused ? 'Dijeda' : next ? `Berikutnya: ${formatDateLabel(next)}` : 'Tidak ada kemunculan berikutnya'}
        {isEditing ? ' · Perubahan hanya berlaku untuk kemunculan berikutnya.' : ''}
      </Txt>

      <Button title={isEditing ? 'Simpan Perubahan' : 'Simpan Aturan'} onPress={save} style={styles.save} />
      {isEditing && (
        <>
          <Button
            title={paused ? 'Lanjutkan' : 'Jeda'}
            variant="outline"
            onPress={run(() => setRecurringRulePaused(db, ruleId, !paused))}
          />
          <Button title="Hentikan mulai hari ini" variant="outline" onPress={run(() => stopRecurringRule(db, ruleId, todayLocal()))} />
          <Button title="Hapus aturan" variant="outline" onPress={confirmDelete} />
        </>
      )}
    </ScrollView>
  );
}

const makeStyles = ({ color, radius, space }: Theme) =>
  StyleSheet.create({
    content: {
      padding: space.lg,
      paddingBottom: space.xxl,
    },
    label: {
      marginTop: space.md,
      marginBottom: space.xs,
    },
    chipRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: space.sm,
    },
    typeButton: {
      flex: 1,
      minHeight: 44,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radius.sm,
      borderWidth: 1,
      borderColor: color.lineStrong,
    },
    expenseSelected: {
      backgroundColor: color.expense,
      borderColor: color.expense,
    },
    incomeSelected: {
      backgroundColor: color.income,
      borderColor: color.income,
    },
    chip: {
      minHeight: 40,
      justifyContent: 'center',
      paddingHorizontal: space.md,
      borderRadius: radius.sm,
      borderWidth: 1,
      borderColor: color.lineStrong,
    },
    chipSelected: {
      backgroundColor: color.ink,
      borderColor: color.ink,
    },
    dates: {
      flexDirection: 'row',
      gap: space.lg,
      marginBottom: space.sm,
    },
    dateField: {
      flex: 1,
    },
    endRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    clear: {
      minWidth: 44,
      minHeight: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
    next: {
      marginTop: space.sm,
    },
    save: {
      marginTop: space.lg,
    },
  });
