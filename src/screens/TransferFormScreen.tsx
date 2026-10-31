import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useSQLiteContext } from '../db/DatabaseProvider';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';

import { listAccounts } from '../db/repos/accounts';
import { getReferenceRateOn } from '../db/repos/fxRates';
import { createTransfer, deleteTransfer, getTransfer, TransferError, updateTransfer } from '../db/repos/transfers';
import { addDays, formatDateLabel, formatDayMonth, fromLocalDate, toLocalDate, todayLocal, type LocalDate } from '../domain/dates';
import { convertWithReference, differenceBasisPoints, rateMicroOf, type ReferenceRate } from '../domain/fx';
import { formatInputValue, formatMoney, impliedRate, parseAmount, SEPARATORS, type CurrencyCode } from '../domain/money';
import type { Locale } from '../i18n/locale';
import type { Account } from '../domain/types';
import { AccountPicker } from '../components/AccountPicker';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Txt } from '../components/Txt';
import type { RootNavigation, RootStackParamList } from '../navigation/types';
import { useThemedStyles, type Theme } from '../theme/ThemeProvider';
import { useI18n } from '../i18n/I18nProvider';

const parse = (text: string, currency: CurrencyCode) => (text.trim() === '' ? null : parseAmount(text, currency));

/** 1566 basis points → "15,66" / "15.66". */
const formatPercent = (bp: number, locale: Locale) => {
  const abs = Math.abs(bp);
  return `${Math.trunc(abs / 100)}${SEPARATORS[locale].decimal}${String(abs % 100).padStart(2, '0')}`;
};

export default function TransferFormScreen() {
  const db = useSQLiteContext();
  const navigation = useNavigation<RootNavigation>();
  const route = useRoute<RouteProp<RootStackParamList, 'TransferForm'>>();
  const styles = useThemedStyles(makeStyles);
  const { t, locale } = useI18n();
  const transferId = route.params?.transferId;
  const isEditing = transferId !== undefined;

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [fromId, setFromId] = useState<number | null>(null);
  const [toId, setToId] = useState<number | null>(null);
  const [sent, setSent] = useState('');
  const [received, setReceived] = useState('');
  const [fee, setFee] = useState('');
  const [date, setDate] = useState<LocalDate>(todayLocal());
  const [note, setNote] = useState('');
  const [showIosPicker, setShowIosPicker] = useState(false);
  const [reference, setReference] = useState<ReferenceRate | null>(null);

  useEffect(() => {
    (async () => {
      const list = await listAccounts(db);
      setAccounts(list);
      if (transferId !== undefined) {
        const transfer = await getTransfer(db, transferId);
        if (!transfer) return;
        setFromId(transfer.fromAccountId);
        setToId(transfer.toAccountId);
        setSent(formatInputValue(transfer.fromAmountMinor, transfer.fromCurrency));
        setReceived(formatInputValue(transfer.toAmountMinor, transfer.toCurrency));
        setFee(transfer.feeMinor ? formatInputValue(transfer.feeMinor, transfer.fromCurrency) : '');
        setDate(transfer.date);
        setNote(transfer.note);
      } else {
        // Default: EUR → IDR, the usual direction.
        const eur = list.find((a) => a.currency === 'EUR');
        const idr = list.find((a) => a.currency === 'IDR');
        setFromId((eur ?? list[0])?.id ?? null);
        setToId((idr ?? list.find((a) => a.id !== (eur ?? list[0])?.id))?.id ?? null);
      }
    })().catch(console.error);
  }, [db, transferId]);

  useEffect(() => {
    getReferenceRateOn(db, date).then(setReference).catch(console.error);
  }, [db, date]);

  const from = accounts.find((a) => a.id === fromId) ?? null;
  const to = accounts.find((a) => a.id === toId) ?? null;
  const sameCurrency = !!from && !!to && from.currency === to.currency;
  const sentMinor = from ? parse(sent, from.currency) : null;
  const receivedMinor = sameCurrency ? sentMinor : to ? parse(received, to.currency) : null;
  const feeMinor = from ? (fee.trim() === '' ? 0 : parseAmount(fee, from.currency)) : null;

  // Actual rate and its gap to the ECB reference of the transfer date.
  const rateInfo = useMemo(() => {
    if (!from || !to || sameCurrency || !sentMinor || !receivedMinor) return null;
    const actual = impliedRate(sentMinor, from.currency, receivedMinor, to.currency);
    const actualMicro = rateMicroOf(actual);
    const perEur = Math.round(actualMicro / 1_000_000);
    const diff = reference ? differenceBasisPoints(actualMicro, reference.rateMicro) : null;
    return { perEur, diff };
  }, [from, to, sameCurrency, sentMinor, receivedMinor, reference]);

  const receivedHint =
    from && to && !sameCurrency && sentMinor && reference
      ? safe(() => convertWithReference(sentMinor, from.currency, to.currency, reference.rateMicro))
      : null;

  const selectFrom = (account: Account) => {
    setFromId(account.id);
    if (account.id === toId) setToId(accounts.find((a) => a.id !== account.id)?.id ?? null);
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
    if (!from || !to) {
      Alert.alert(t('transfer.pickAccountsTitle'), t('transfer.pickAccounts'));
      return;
    }
    if (!sentMinor || sentMinor <= 0 || !receivedMinor || receivedMinor <= 0) {
      Alert.alert(t('quickAdd.invalidAmountTitle'), t('transfer.invalidAmounts'));
      return;
    }
    if (feeMinor === null || feeMinor < 0) {
      Alert.alert(t('transfer.invalidFeeTitle'), t('transfer.invalidFee'));
      return;
    }
    const transfer = {
      fromAccountId: from.id,
      toAccountId: to.id,
      fromAmountMinor: sentMinor,
      toAmountMinor: receivedMinor,
      feeMinor,
      date,
      note,
    };
    try {
      if (isEditing) await updateTransfer(db, transferId, transfer);
      else await createTransfer(db, transfer);
      navigation.goBack();
    } catch (e) {
      if (e instanceof TransferError) Alert.alert(t('transfer.invalidTitle'), e.message);
      else {
        console.error(e);
        Alert.alert(t('common.failed'), t('transfer.saveFailed'));
      }
    }
  };

  const remove = () => {
    if (transferId === undefined) return;
    Alert.alert(t('transfer.delete'), t('transfer.deleteMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteTransfer(db, transferId);
            navigation.goBack();
          } catch (e) {
            console.error(e);
            Alert.alert(t('common.failed'), t('transfer.deleteFailed'));
          }
        },
      },
    ]);
  };

  const today = todayLocal();
  const dateLabel =
    date === today ? t('common.today') : date === addDays(today, -1) ? t('common.yesterday') : formatDateLabel(date, locale);

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Txt variant="label" tone="inkMuted" style={styles.label}>{t('transfer.from')}</Txt>
      <AccountPicker accounts={accounts} selectedId={fromId} onSelect={selectFrom} />
      <Txt variant="label" tone="inkMuted" style={styles.label}>{t('transfer.to')}</Txt>
      <AccountPicker accounts={accounts.filter((a) => a.id !== fromId)} selectedId={toId} onSelect={(a) => setToId(a.id)} />

      {from && (
        <Input
          label={t('transfer.sent', { currency: from.currency })}
          placeholder={formatInputValue(from.currency === 'EUR' ? 20000 : 3_000_000, from.currency)}
          value={sent}
          onChangeText={setSent}
          keyboardType={from.currency === 'EUR' ? 'decimal-pad' : 'number-pad'}
        />
      )}
      {to && !sameCurrency && (
        <Input
          label={t('transfer.received', { currency: to.currency })}
          placeholder={receivedHint !== null ? formatInputValue(receivedHint, to.currency) : undefined}
          value={received}
          onChangeText={setReceived}
          keyboardType={to.currency === 'EUR' ? 'decimal-pad' : 'number-pad'}
        />
      )}
      {sameCurrency && <Txt variant="caption" tone="inkMuted">{t('transfer.sameCurrency')}</Txt>}

      {rateInfo && (
        <View style={styles.rateBox}>
          <Txt variant="bodyStrong">{t('transfer.rate', { rate: formatMoney(rateInfo.perEur, 'IDR') })}</Txt>
          {rateInfo.diff !== null && reference && (
            <Txt variant="caption" tone="inkMuted">
              {rateInfo.diff === 0
                ? t('transfer.rateSame', { date: formatDayMonth(reference.date) })
                : t(rateInfo.diff < 0 ? 'transfer.rateBelow' : 'transfer.rateAbove', {
                    percent: formatPercent(rateInfo.diff, locale),
                    date: formatDayMonth(reference.date),
                    rate: formatMoney(Math.round(reference.rateMicro / 1_000_000), 'IDR'),
                  })}
            </Txt>
          )}
        </View>
      )}

      {from && (
        <Input
          label={t('transfer.fee', { currency: from.currency })}
          placeholder="0"
          value={fee}
          onChangeText={setFee}
          keyboardType={from.currency === 'EUR' ? 'decimal-pad' : 'number-pad'}
        />
      )}

      <View style={styles.metaRow}>
        <Pressable onPress={pickDate} style={styles.dateChip} accessibilityRole="button" accessibilityLabel={t('common.dateValue', { date: dateLabel })}>
          <Txt variant="label">{dateLabel}</Txt>
        </Pressable>
      </View>
      {showIosPicker && (
        <DateTimePicker value={fromLocalDate(date)} mode="date" display="inline" onChange={(_, picked) => picked && setDate(toLocalDate(picked))} />
      )}
      <Input label={t('common.noteOptional')} value={note} onChangeText={setNote} />

      <Button title={t(isEditing ? 'common.saveChanges' : 'transfer.save')} onPress={save} style={styles.save} />
      {isEditing && <Button title={t('transfer.delete')} variant="outline" onPress={remove} />}
    </ScrollView>
  );
}

function safe(convert: () => number): number | null {
  try {
    return convert();
  } catch {
    return null;
  }
}

const makeStyles = ({ color, radius, space }: Theme) =>
  StyleSheet.create({
    content: {
      padding: space.lg,
      paddingBottom: space.xxl,
    },
    label: {
      marginTop: space.sm,
      marginBottom: space.xs,
    },
    rateBox: {
      paddingVertical: space.sm,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderColor: color.line,
      marginVertical: space.sm,
    },
    metaRow: {
      flexDirection: 'row',
      marginVertical: space.sm,
    },
    dateChip: {
      minHeight: 44,
      justifyContent: 'center',
      paddingHorizontal: space.md,
      borderRadius: radius.sm,
      borderWidth: 1,
      borderColor: color.lineStrong,
    },
    save: {
      marginTop: space.lg,
    },
  });
