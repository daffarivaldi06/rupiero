import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { Alert, BackHandler, Platform, Pressable, StyleSheet, View } from 'react-native';
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetTextInput,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import * as Haptics from 'expo-haptics';
import { useSQLiteContext } from 'expo-sqlite';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { listAccounts } from '../db/repos/accounts';
import { createRecurringRule, materializeDue } from '../db/repos/recurring';
import { getLastAccountId, setLastAccountId } from '../db/repos/settings';
import {
  createTransaction,
  deleteTransaction,
  getTransaction,
  listCategoriesByUse,
  updateTransaction,
} from '../db/repos/transactions';
import {
  evaluateExpression,
  expressionFromMinor,
  hasOperator,
  pressKey,
  withoutTrailingOperator,
  type KeypadKey,
} from '../domain/calc';
import { addDays, formatDateLabel, formatDayMonth, fromLocalDate, toLocalDate, todayLocal, type LocalDate } from '../domain/dates';
import { convertWithReference } from '../domain/fx';
import { FREQUENCIES, type Frequency } from '../domain/recurrence';
import type { Account, Category, TransactionType } from '../domain/types';
import { AccountPicker } from '../components/AccountPicker';
import { Button } from '../components/Button';
import { CategoryChips } from '../components/CategoryChips';
import { Keypad } from '../components/Keypad';
import { Money } from '../components/Money';
import { Txt } from '../components/Txt';
import { useReferenceRate } from '../fx/FxProvider';
import { useTheme, useThemedStyles, type Theme } from '../theme/ThemeProvider';
import { fontFamily } from '../theme/typography';

const REPEAT_LABEL: Record<Frequency, string> = { daily: 'Harian', weekly: 'Mingguan', monthly: 'Bulanan', yearly: 'Tahunan' };

export interface QuickAddOptions {
  type?: TransactionType;
  categoryId?: number;
  /** Edit this transaction instead of adding one. */
  transactionId?: number;
}

export interface QuickAddSheetHandle {
  open: (options?: QuickAddOptions) => Promise<void>;
}

/** Add or edit a transaction: type, account, keypad amount (with calculator), category, date and note. */
export const QuickAddSheet = forwardRef<QuickAddSheetHandle>(function QuickAddSheet(_props, ref) {
  const db = useSQLiteContext();
  const { color } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const referenceRate = useReferenceRate();
  const sheetRef = useRef<BottomSheetModal>(null);
  const [open, setOpen] = useState(false);

  // Android back closes the sheet instead of leaving the screen (or the app) underneath.
  useEffect(() => {
    if (!open) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      sheetRef.current?.dismiss();
      return true;
    });
    return () => subscription.remove();
  }, [open]);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [type, setType] = useState<TransactionType>('expense');
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountId, setAccountId] = useState<number | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [expression, setExpression] = useState('');
  const [date, setDate] = useState<LocalDate>(todayLocal());
  const [note, setNote] = useState('');
  /** New transactions only: also create a recurring rule starting on `date`. */
  const [repeat, setRepeat] = useState<Frequency | null>(null);
  const [showIosPicker, setShowIosPicker] = useState(false);

  const account = accounts.find((a) => a.id === accountId) ?? null;
  const currency = account?.currency ?? 'EUR';
  const amount = useMemo(() => evaluateExpression(withoutTrailingOperator(expression), currency), [expression, currency]);

  useImperativeHandle(ref, () => ({
    open: async (options = {}) => {
      const today = todayLocal();
      const [nextAccounts, nextCategories, lastAccountId, editing] = await Promise.all([
        listAccounts(db),
        listCategoriesByUse(db, { today }),
        getLastAccountId(db),
        options.transactionId !== undefined ? getTransaction(db, options.transactionId) : Promise.resolve(null),
      ]);
      setAccounts(nextAccounts);
      setCategories(nextCategories);
      setShowIosPicker(false);
      setRepeat(null);
      if (editing) {
        setEditingId(editing.id);
        setType(editing.type);
        setAccountId(editing.accountId);
        setCategoryId(editing.categoryId);
        setExpression(expressionFromMinor(editing.amountMinor, editing.currency));
        setDate(editing.date);
        setNote(editing.note);
      } else {
        const fallback = nextAccounts.find((a) => a.id === lastAccountId) ?? nextAccounts[0] ?? null;
        setEditingId(null);
        setType(options.type ?? 'expense');
        setAccountId(fallback?.id ?? null);
        setCategoryId(options.categoryId ?? null);
        setExpression('');
        setDate(today);
        setNote('');
      }
      setOpen(true);
      sheetRef.current?.present();
    },
  }));

  const onKey = useCallback(
    (key: KeypadKey) => setExpression((current) => pressKey(current, key, currency)),
    [currency],
  );

  const selectAccount = (next: Account) => {
    setAccountId(next.id);
    // Decimals typed for EUR mean nothing in IDR (and vice versa for "000"), so start over if invalid.
    if (expression && evaluateExpression(withoutTrailingOperator(expression), next.currency) === null) setExpression('');
  };

  const pickDate = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: fromLocalDate(date),
        mode: 'date',
        onChange: (event, picked) => {
          if (event.type === 'set' && picked) setDate(toLocalDate(picked));
        },
      });
    } else {
      setShowIosPicker((shown) => !shown);
    }
  };

  const save = async () => {
    if (!account) {
      Alert.alert('Belum ada akun', 'Tambahkan akun terlebih dahulu');
      return;
    }
    if (amount === null || amount <= 0) {
      Alert.alert('Nominal belum valid', 'Masukkan nominal lebih dari nol');
      return;
    }
    if (categoryId === null) {
      Alert.alert('Pilih kategori', 'Tap salah satu kategori');
      return;
    }
    const tx = { accountId: account.id, categoryId, type, amountMinor: amount, date, note };
    try {
      if (editingId !== null) await updateTransaction(db, editingId, tx);
      else if (repeat !== null) {
        // The rule's first occurrence is this transaction; materializing creates it (if not in the future).
        await createRecurringRule(db, { ...tx, frequency: repeat, interval: 1, startDate: date });
        await materializeDue(db, todayLocal());
      } else await createTransaction(db, tx);
      await setLastAccountId(db, account.id);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      sheetRef.current?.dismiss();
    } catch (e) {
      console.error(e);
      Alert.alert('Gagal', 'Transaksi tidak dapat disimpan');
    }
  };

  const remove = () => {
    if (editingId === null) return;
    Alert.alert('Hapus transaksi', 'Transaksi ini akan dihapus permanen.', [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Hapus',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteTransaction(db, editingId);
            sheetRef.current?.dismiss();
          } catch (e) {
            console.error(e);
            Alert.alert('Gagal', 'Transaksi tidak dapat dihapus');
          }
        },
      },
    ]);
  };

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} pressBehavior="close" />,
    [],
  );

  const today = todayLocal();
  const dateLabel = date === today ? 'Hari ini' : date === addDays(today, -1) ? 'Kemarin' : formatDateLabel(date);
  const otherCurrency = currency === 'EUR' ? 'IDR' : 'EUR';
  const preview =
    referenceRate && amount !== null && amount > 0 ? safeConvert(amount, currency, otherCurrency, referenceRate.rateMicro) : null;

  return (
    <BottomSheetModal
      ref={sheetRef}
      onDismiss={() => setOpen(false)}
      backdropComponent={renderBackdrop}
      backgroundStyle={styles.sheet}
      handleIndicatorStyle={{ backgroundColor: color.lineStrong }}
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
      android_keyboardInputMode="adjustResize"
    >
      <BottomSheetScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 12 }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.typeRow}>
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

        <AccountPicker accounts={accounts} selectedId={accountId} onSelect={selectAccount} />

        <View style={styles.amountBlock} accessibilityLiveRegion="polite">
          {hasOperator(expression) && (
            <Txt variant="body" tone="inkMuted" numberOfLines={1} style={styles.expression}>{expression}</Txt>
          )}
          <Money
            minor={amount !== null && expression ? amount : 0}
            currency={currency}
            variant="display"
            tone={expression ? 'neutral' : 'inkMuted'}
            reveal
          />
          {preview !== null && referenceRate && (
            <Txt variant="caption" tone="inkMuted">
              ≈ <Money minor={preview} currency={otherCurrency} variant="caption" tone="inkMuted" reveal /> · kurs ECB {formatDayMonth(referenceRate.date)}
            </Txt>
          )}
        </View>

        <CategoryChips categories={categories} selectedId={categoryId} onSelect={setCategoryId} />

        <View style={styles.metaRow}>
          <Pressable onPress={pickDate} style={styles.dateChip} accessibilityRole="button" accessibilityLabel={`Tanggal: ${dateLabel}`}>
            <Txt variant="label">{dateLabel}</Txt>
          </Pressable>
          <BottomSheetTextInput
            value={note}
            onChangeText={setNote}
            placeholder="Catatan (opsional)"
            placeholderTextColor={color.inkMuted}
            style={styles.note}
            returnKeyType="done"
          />
        </View>
        {editingId === null && (
          <View style={styles.repeatRow}>
            <Txt variant="label" tone="inkMuted">Ulangi</Txt>
            {([null, ...FREQUENCIES] as const).map((value) => {
              const selected = repeat === value;
              return (
                <Pressable
                  key={value ?? 'none'}
                  onPress={() => setRepeat(value)}
                  style={[styles.repeatChip, selected && styles.repeatSelected]}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                >
                  <Txt variant="caption" tone={selected ? 'onInk' : 'ink'}>{value === null ? 'Tidak' : REPEAT_LABEL[value]}</Txt>
                </Pressable>
              );
            })}
          </View>
        )}
        {showIosPicker && (
          <DateTimePicker value={fromLocalDate(date)} mode="date" display="inline" onChange={(_, picked) => picked && setDate(toLocalDate(picked))} />
        )}

        <Keypad currency={currency} onKey={onKey} onClear={() => setExpression('')} />

        <View style={styles.actions}>
          {editingId !== null && <Button title="Hapus" variant="outline" onPress={remove} style={styles.deleteButton} />}
          <Button title={editingId !== null ? 'Simpan Perubahan' : 'Simpan'} onPress={save} style={styles.saveButton} />
        </View>
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
});

/** The conversion preview, or null if the amount is too large to convert safely. */
function safeConvert(minor: number, from: 'EUR' | 'IDR', to: 'EUR' | 'IDR', rateMicro: number): number | null {
  try {
    return convertWithReference(minor, from, to, rateMicro);
  } catch {
    return null;
  }
}

const makeStyles = ({ color, radius, space }: Theme) =>
  StyleSheet.create({
    sheet: {
      backgroundColor: color.surface,
      borderRadius: radius.md,
    },
    content: {
      paddingHorizontal: space.lg,
      gap: space.md,
    },
    typeRow: {
      flexDirection: 'row',
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
    amountBlock: {
      minHeight: 76,
      justifyContent: 'center',
    },
    expression: {
      fontVariant: ['tabular-nums'],
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space.sm,
    },
    dateChip: {
      minHeight: 44,
      justifyContent: 'center',
      paddingHorizontal: space.md,
      borderRadius: radius.sm,
      borderWidth: 1,
      borderColor: color.lineStrong,
    },
    note: {
      flex: 1,
      minHeight: 44,
      paddingHorizontal: space.md,
      borderRadius: radius.sm,
      borderWidth: 1,
      borderColor: color.lineStrong,
      color: color.ink,
      fontFamily: fontFamily.regular,
      fontSize: 15,
    },
    repeatRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: space.xs,
    },
    repeatChip: {
      minHeight: 40,
      justifyContent: 'center',
      paddingHorizontal: space.sm,
      borderRadius: radius.sm,
      borderWidth: 1,
      borderColor: color.lineStrong,
    },
    repeatSelected: {
      backgroundColor: color.ink,
      borderColor: color.ink,
    },
    actions: {
      flexDirection: 'row',
      gap: space.md,
    },
    deleteButton: {
      flex: 1,
    },
    saveButton: {
      flex: 2,
    },
  });
