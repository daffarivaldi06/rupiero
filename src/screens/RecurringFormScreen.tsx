import React, { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { useSQLiteContext } from '../db/DatabaseProvider';
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
import { FormScroll } from '../components/FormScroll';
import { useToast } from '../feedback/ToastProvider';
import { CategoryChips } from '../components/CategoryChips';
import { DateChip } from '../components/DateChip';
import { Input } from '../components/Input';
import { Txt } from '../components/Txt';
import type { RootNavigation, RootStackParamList } from '../navigation/types';
import { useThemedStyles, type Theme } from '../theme/ThemeProvider';
import { useI18n } from '../i18n/I18nProvider';

export default function RecurringFormScreen() {
  const db = useSQLiteContext();
  const navigation = useNavigation<RootNavigation>();
  const route = useRoute<RouteProp<RootStackParamList, 'RecurringForm'>>();
  const styles = useThemedStyles(makeStyles);
  const { t } = useI18n();
  const toast = useToast();
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

  const amountMinor = account ? parseAmount(amount, account.currency) : null;
  const amountError =
    account && amount.trim() !== '' && (amountMinor === null || amountMinor <= 0)
      ? t('money.amountHint', { example: formatInputValue(account.currency === 'EUR' ? 999 : 150_000, account.currency) })
      : undefined;
  const endError = endDate !== null && endDate < startDate ? t('recurringForm.endBeforeStart') : undefined;
  const canSave = !!account && categoryId !== null && !!amountMinor && amountMinor > 0 && intervalValid && !endError;

  const save = async () => {
    if (!account || categoryId === null || !amountMinor || !canSave) return;
    const rule = { accountId: account.id, categoryId, type, amountMinor, note, frequency, interval: intervalCount, startDate, endDate };
    try {
      if (isEditing) await updateRecurringRule(db, ruleId, rule);
      else await createRecurringRule(db, rule);
      await finish();
    } catch (e) {
      console.error(e);
      toast.show(t('recurringForm.saveFailed'), { tone: 'error' });
    }
  };

  const run = (action: () => Promise<void>) => async () => {
    try {
      await action();
      await finish();
    } catch (e) {
      console.error(e);
      toast.show(t('recurringForm.changeFailed'), { tone: 'error' });
    }
  };

  const confirmDelete = () =>
    Alert.alert(t('recurringForm.delete'), t('recurringForm.deleteMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive', onPress: run(() => deleteRecurringRule(db, ruleId!)) },
    ]);

  return (
    <FormScroll contentContainerStyle={styles.content}>
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
                {t(value === 'expense' ? 'common.expense' : 'common.income')}
              </Txt>
            </Pressable>
          );
        })}
      </View>

      <Txt variant="label" tone="inkMuted" style={styles.label}>{t('common.account')}</Txt>
      <AccountPicker accounts={accounts} selectedId={accountId} onSelect={(a) => setAccountId(a.id)} />

      {account && (
        <Input
          label={t('recurringForm.amount', { currency: account.currency })}
          placeholder={formatInputValue(account.currency === 'EUR' ? 999 : 150_000, account.currency)}
          value={amount}
          onChangeText={setAmount}
          keyboardType={account.currency === 'EUR' ? 'decimal-pad' : 'number-pad'}
          error={amountError}
        />
      )}

      <Txt variant="label" tone="inkMuted" style={styles.label}>{t('common.category')}</Txt>
      <CategoryChips categories={categories} selectedId={categoryId} onSelect={setCategoryId} />

      <Txt variant="label" tone="inkMuted" style={styles.label}>{t('recurringForm.frequency')}</Txt>
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
              <Txt variant="label" tone={selected ? 'onInk' : 'ink'}>{t(`frequency.${value}`)}</Txt>
            </Pressable>
          );
        })}
      </View>
      <Input
        label={t('recurringForm.interval')}
        value={intervalText}
        onChangeText={setIntervalText}
        keyboardType="number-pad"
        error={intervalValid ? undefined : t('recurringForm.intervalRange')}
      />
      {intervalValid && <Txt variant="caption" tone="inkMuted">{describeFrequency(frequency, intervalCount)}</Txt>}

      <View style={styles.dates}>
        <View style={styles.dateField}>
          <Txt variant="label" tone="inkMuted" style={styles.label}>{t('recurringForm.start')}</Txt>
          <DateChip value={startDate} onChange={setStartDate} accessibilityLabel={t('recurringForm.startDate')} />
        </View>
        <View style={styles.dateField}>
          <Txt variant="label" tone="inkMuted" style={styles.label}>{t('recurringForm.end')}</Txt>
          <View style={styles.endRow}>
            <DateChip value={endDate} onChange={setEndDate} placeholder={t('recurringForm.noEnd')} accessibilityLabel={t('recurringForm.endDate')} minimumDate={startDate} />
            {endDate !== null && (
              <Pressable onPress={() => setEndDate(null)} style={styles.clear} accessibilityRole="button" accessibilityLabel={t('recurringForm.clearEnd')}>
                <Txt tone="inkMuted">✕</Txt>
              </Pressable>
            )}
          </View>
        </View>
      </View>

      {endError && <Txt variant="caption" tone="expense">{endError}</Txt>}

      <Input label={t('recurringForm.note')} value={note} onChangeText={setNote} />

      <Txt variant="caption" tone="inkMuted" style={styles.next}>
        {paused ? t('recurringForm.paused') : next ? t('recurringForm.next', { date: formatDateLabel(next) }) : t('recurringForm.noNext')}
        {isEditing ? ` · ${t('recurringForm.editNote')}` : ''}
      </Txt>

      <Button title={t(isEditing ? 'common.saveChanges' : 'recurringForm.save')} onPress={save} disabled={!canSave} style={styles.save} />
      {isEditing && (
        <>
          <Button
            title={t(paused ? 'recurringForm.resume' : 'recurringForm.pause')}
            variant="outline"
            onPress={run(() => setRecurringRulePaused(db, ruleId, !paused))}
          />
          <Button title={t('recurringForm.stopToday')} variant="outline" onPress={run(() => stopRecurringRule(db, ruleId, todayLocal()))} />
          <Button title={t('recurringForm.delete')} variant="outline" onPress={confirmDelete} />
        </>
      )}
    </FormScroll>
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
