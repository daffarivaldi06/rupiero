import React, { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSQLiteContext } from '../db/DatabaseProvider';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';

import {
  AccountCurrencyLockedError,
  accountHasActivity,
  createAccount,
  getAccount,
  setAccountArchived,
  updateAccount,
} from '../db/repos/accounts';
import { CURRENCY_CODES, formatInputValue, parseAmount, type CurrencyCode } from '../domain/money';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Txt } from '../components/Txt';
import type { RootNavigation, RootStackParamList } from '../navigation/types';
import { useThemedStyles, type Theme } from '../theme/ThemeProvider';
import { useI18n } from '../i18n/I18nProvider';

/** Opening balances may be negative (e.g. a credit card), so allow a leading minus. */
function parseSignedAmount(text: string, currency: CurrencyCode): number | null {
  const trimmed = text.trim();
  if (trimmed === '') return 0;
  const negative = trimmed.startsWith('-') || trimmed.startsWith('−');
  const value = parseAmount(negative ? trimmed.slice(1) : trimmed, currency);
  return value === null ? null : negative ? -value : value;
}

export default function AccountFormScreen() {
  const db = useSQLiteContext();
  const navigation = useNavigation<RootNavigation>();
  const route = useRoute<RouteProp<RootStackParamList, 'AccountForm'>>();
  const styles = useThemedStyles(makeStyles);
  const { t } = useI18n();
  const accountId = route.params?.accountId;
  const isEditing = accountId !== undefined;

  const [name, setName] = useState('');
  const [currency, setCurrency] = useState<CurrencyCode>('IDR');
  const [opening, setOpening] = useState('');
  const [archived, setArchived] = useState(false);
  const [currencyLocked, setCurrencyLocked] = useState(false);
  const [openingError, setOpeningError] = useState<string>();

  useEffect(() => {
    if (accountId === undefined) return;
    (async () => {
      const account = await getAccount(db, accountId);
      if (!account) return;
      setName(account.name);
      setCurrency(account.currency);
      setArchived(account.archived);
      const minor = account.openingBalanceMinor;
      setOpening(minor === 0 ? '' : `${minor < 0 ? '-' : ''}${formatInputValue(Math.abs(minor), account.currency)}`);
      setCurrencyLocked(await accountHasActivity(db, accountId));
    })().catch(console.error);
  }, [db, accountId]);

  const save = async () => {
    if (!name.trim()) {
      Alert.alert(t('accountForm.nameEmptyTitle'), t('accountForm.nameEmpty'));
      return;
    }
    const openingBalanceMinor = parseSignedAmount(opening, currency);
    if (openingBalanceMinor === null) {
      setOpeningError(t('money.amountHint', { example: formatInputValue(currency === 'EUR' ? 125050 : 1_250_000, currency) }));
      return;
    }
    try {
      const account = { name, currency, openingBalanceMinor };
      if (isEditing) await updateAccount(db, accountId, account);
      else await createAccount(db, account);
      navigation.goBack();
    } catch (e) {
      if (e instanceof AccountCurrencyLockedError) Alert.alert(t('accountForm.currencyLockedTitle'), e.message);
      else {
        console.error(e);
        Alert.alert(t('accountForm.saveFailedTitle'), t('accountForm.saveFailed'));
      }
    }
  };

  const toggleArchive = async () => {
    if (accountId === undefined) return;
    try {
      await setAccountArchived(db, accountId, !archived);
      navigation.goBack();
    } catch (e) {
      console.error(e);
      Alert.alert(t('common.failed'), t('accountForm.archiveFailed'));
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Input label={t('accountForm.name')} placeholder={t('accountForm.namePlaceholder')} value={name} onChangeText={setName} autoFocus={!isEditing} />

      <Txt variant="label" tone="inkMuted" style={styles.label}>{t('accountForm.currency')}</Txt>
      <View style={styles.currencyRow}>
        {CURRENCY_CODES.map((code) => {
          const selected = code === currency;
          return (
            <Pressable
              key={code}
              disabled={currencyLocked}
              onPress={() => {
                setCurrency(code);
                setOpeningError(undefined);
              }}
              style={[styles.currencyChip, selected && styles.currencySelected, currencyLocked && !selected && styles.disabled]}
              accessibilityRole="radio"
              accessibilityState={{ selected, disabled: currencyLocked }}
            >
              <Txt variant="code" tone={selected ? 'onInk' : code === 'EUR' ? 'eur' : 'idrText'}>{code}</Txt>
            </Pressable>
          );
        })}
      </View>
      {currencyLocked && (
        <Txt variant="caption" tone="inkMuted" style={styles.hint}>{t('accountForm.currencyLocked')}</Txt>
      )}

      <Input
        label={t('accountForm.opening')}
        placeholder={formatInputValue(0, currency)}
        value={opening}
        onChangeText={(text) => {
          setOpening(text);
          setOpeningError(undefined);
        }}
        keyboardType={currency === 'EUR' ? 'decimal-pad' : 'number-pad'}
        error={openingError}
      />

      <Button title={t(isEditing ? 'common.saveChanges' : 'accountForm.create')} onPress={save} style={styles.save} />
      {isEditing && (
        <Button title={t(archived ? 'accountForm.unarchive' : 'accountForm.archive')} variant="outline" onPress={toggleArchive} />
      )}
    </ScrollView>
  );
}

const makeStyles = ({ color, radius, space }: Theme) =>
  StyleSheet.create({
    content: {
      padding: space.xl,
    },
    label: {
      marginTop: space.sm,
      marginBottom: space.xs,
    },
    currencyRow: {
      flexDirection: 'row',
      gap: space.sm,
    },
    currencyChip: {
      minWidth: 72,
      minHeight: 44,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radius.sm,
      borderWidth: 1,
      borderColor: color.lineStrong,
    },
    currencySelected: {
      backgroundColor: color.ink,
      borderColor: color.ink,
    },
    disabled: {
      opacity: 0.35,
    },
    hint: {
      marginTop: space.xs,
    },
    save: {
      marginTop: space.lg,
    },
  });
