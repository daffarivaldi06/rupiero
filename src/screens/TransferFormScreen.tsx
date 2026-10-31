import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useSQLiteContext } from 'expo-sqlite';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';

import { listAccounts } from '../db/repos/accounts';
import { getReferenceRateOn } from '../db/repos/fxRates';
import { createTransfer, deleteTransfer, getTransfer, TransferError, updateTransfer } from '../db/repos/transfers';
import { addDays, formatDateLabel, formatDayMonth, fromLocalDate, toLocalDate, todayLocal, type LocalDate } from '../domain/dates';
import { convertWithReference, differenceBasisPoints, rateMicroOf, type ReferenceRate } from '../domain/fx';
import { formatInputValue, formatMoney, impliedRate, parseAmount, type CurrencyCode } from '../domain/money';
import type { Account } from '../domain/types';
import { AccountPicker } from '../components/AccountPicker';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Txt } from '../components/Txt';
import type { RootNavigation, RootStackParamList } from '../navigation/types';
import { useThemedStyles, type Theme } from '../theme/ThemeProvider';

const parse = (text: string, currency: CurrencyCode) => (text.trim() === '' ? null : parseAmount(text, currency));

/** "1566" basis points → "15,66". */
const formatPercent = (bp: number) => {
  const abs = Math.abs(bp);
  return `${Math.trunc(abs / 100)},${String(abs % 100).padStart(2, '0')}`;
};

export default function TransferFormScreen() {
  const db = useSQLiteContext();
  const navigation = useNavigation<RootNavigation>();
  const route = useRoute<RouteProp<RootStackParamList, 'TransferForm'>>();
  const styles = useThemedStyles(makeStyles);
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
      Alert.alert('Pilih akun', 'Pilih akun asal dan tujuan');
      return;
    }
    if (!sentMinor || sentMinor <= 0 || !receivedMinor || receivedMinor <= 0) {
      Alert.alert('Nominal belum valid', 'Isi nominal kirim dan terima lebih dari nol');
      return;
    }
    if (feeMinor === null || feeMinor < 0) {
      Alert.alert('Biaya belum valid', 'Kosongkan atau isi biaya transfer');
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
      if (e instanceof TransferError) Alert.alert('Transfer tidak valid', e.message);
      else {
        console.error(e);
        Alert.alert('Gagal', 'Transfer tidak dapat disimpan');
      }
    }
  };

  const remove = () => {
    if (transferId === undefined) return;
    Alert.alert('Hapus transfer', 'Transfer ini akan dihapus dari kedua akun.', [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Hapus',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteTransfer(db, transferId);
            navigation.goBack();
          } catch (e) {
            console.error(e);
            Alert.alert('Gagal', 'Transfer tidak dapat dihapus');
          }
        },
      },
    ]);
  };

  const today = todayLocal();
  const dateLabel = date === today ? 'Hari ini' : date === addDays(today, -1) ? 'Kemarin' : formatDateLabel(date);

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Txt variant="label" tone="inkMuted" style={styles.label}>Dari</Txt>
      <AccountPicker accounts={accounts} selectedId={fromId} onSelect={selectFrom} />
      <Txt variant="label" tone="inkMuted" style={styles.label}>Ke</Txt>
      <AccountPicker accounts={accounts.filter((a) => a.id !== fromId)} selectedId={toId} onSelect={(a) => setToId(a.id)} />

      {from && (
        <Input
          label={`Dikirim (${from.currency})`}
          placeholder={from.currency === 'EUR' ? '200,00' : '3.000.000'}
          value={sent}
          onChangeText={setSent}
          keyboardType={from.currency === 'EUR' ? 'decimal-pad' : 'number-pad'}
        />
      )}
      {to && !sameCurrency && (
        <Input
          label={`Diterima (${to.currency})`}
          placeholder={receivedHint !== null ? formatInputValue(receivedHint, to.currency) : undefined}
          value={received}
          onChangeText={setReceived}
          keyboardType={to.currency === 'EUR' ? 'decimal-pad' : 'number-pad'}
        />
      )}
      {sameCurrency && <Txt variant="caption" tone="inkMuted">Mata uang sama: jumlah diterima sama dengan yang dikirim.</Txt>}

      {rateInfo && (
        <View style={styles.rateBox}>
          <Txt variant="bodyStrong">1 EUR = {formatMoney(rateInfo.perEur, 'IDR')}</Txt>
          {rateInfo.diff !== null && reference && (
            <Txt variant="caption" tone="inkMuted">
              {rateInfo.diff === 0
                ? `Sama dengan kurs ECB ${formatDayMonth(reference.date)}`
                : `${formatPercent(rateInfo.diff)}% ${rateInfo.diff < 0 ? 'di bawah' : 'di atas'} kurs ECB ${formatDayMonth(reference.date)} (${formatMoney(Math.round(reference.rateMicro / 1_000_000), 'IDR')})`}
            </Txt>
          )}
        </View>
      )}

      {from && (
        <Input
          label={`Biaya transfer (${from.currency}, opsional)`}
          placeholder="0"
          value={fee}
          onChangeText={setFee}
          keyboardType={from.currency === 'EUR' ? 'decimal-pad' : 'number-pad'}
        />
      )}

      <View style={styles.metaRow}>
        <Pressable onPress={pickDate} style={styles.dateChip} accessibilityRole="button" accessibilityLabel={`Tanggal: ${dateLabel}`}>
          <Txt variant="label">{dateLabel}</Txt>
        </Pressable>
      </View>
      {showIosPicker && (
        <DateTimePicker value={fromLocalDate(date)} mode="date" display="inline" onChange={(_, picked) => picked && setDate(toLocalDate(picked))} />
      )}
      <Input label="Catatan (opsional)" value={note} onChangeText={setNote} />

      <Button title={isEditing ? 'Simpan Perubahan' : 'Simpan Transfer'} onPress={save} style={styles.save} />
      {isEditing && <Button title="Hapus transfer" variant="outline" onPress={remove} />}
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
