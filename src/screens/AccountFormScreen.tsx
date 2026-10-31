import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
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
import { FormScroll } from '../components/FormScroll';
import { useToast } from '../feedback/ToastProvider';
import { isUniqueViolation } from '../db/errors';
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
  const toast = useToast();
  const accountId = route.params?.accountId;
  const isEditing = accountId !== undefined;

  const [name, setName] = useState('');
  const [currency, setCurrency] = useState<CurrencyCode>('IDR');
  const [opening, setOpening] = useState('');
  const [archived, setArchived] = useState(false);
  const [currencyLocked, setCurrencyLocked] = useState(false);
  const [nameError, setNameError] = useState<string>();
  const [currencyError, setCurrencyError] = useState<string>();

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

  const openingBalanceMinor = parseSignedAmount(opening, currency);
  const openingError =
    openingBalanceMinor === null
      ? t('money.amountHint', { example: formatInputValue(currency === 'EUR' ? 125050 : 1_250_000, currency) })
      : undefined;
  const canSave = name.trim() !== '' && openingBalanceMinor !== null;

  const save = async () => {
    if (!canSave) return;
    try {
      const account = { name, currency, openingBalanceMinor };
      if (isEditing) await updateAccount(db, accountId, account);
      else await createAccount(db, account);
      navigation.goBack();
    } catch (e) {
      if (e instanceof AccountCurrencyLockedError) setCurrencyError(e.message);
      else if (isUniqueViolation(e)) setNameError(t('accountForm.nameTaken'));
      else {
        console.error(e);
        toast.show(t('accountForm.saveFailed'), { tone: 'error' });
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
      toast.show(t('accountForm.archiveFailed'), { tone: 'error' });
    }
  };

  return (
    <FormScroll contentContainerStyle={styles.content}>
      <Input
        label={t('accountForm.name')}
        placeholder={t('accountForm.namePlaceholder')}
        value={name}
        onChangeText={(text) => {
          setName(text);
          setNameError(undefined);
        }}
        autoFocus={!isEditing}
        error={nameError}
      />

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
                setCurrencyError(undefined);
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
      {currencyError && (
        <Txt variant="caption" tone="expense" style={styles.hint}>{currencyError}</Txt>
      )}

      <Input
        label={t('accountForm.opening')}
        placeholder={formatInputValue(0, currency)}
        value={opening}
        onChangeText={setOpening}
        keyboardType={currency === 'EUR' ? 'decimal-pad' : 'number-pad'}
        error={openingError}
      />

      <Button title={t(isEditing ? 'common.saveChanges' : 'accountForm.create')} onPress={save} disabled={!canSave} style={styles.save} />
      {isEditing && (
        <Button title={t(archived ? 'accountForm.unarchive' : 'accountForm.archive')} variant="outline" onPress={toggleArchive} />
      )}
    </FormScroll>
  );
}

const makeStyles = ({ color, radius, space }: Theme) =>
  StyleSheet.create({
    content: {
      paddingVertical: space.xl,
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
      minHeight: 48,
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
