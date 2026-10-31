import React, { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import { useSQLiteContext } from '../db/DatabaseProvider';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';

import { deleteBudget, listCategoryBudgets, setBudget } from '../db/repos/budgets';
import { getCategory } from '../db/repos/categories';
import { formatMonthLabel } from '../domain/dates';
import { CURRENCY_CODES, formatInputValue, parseAmount, type CurrencyCode } from '../domain/money';
import { Button } from '../components/Button';
import { FormScroll } from '../components/FormScroll';
import { useToast } from '../feedback/ToastProvider';
import { Input } from '../components/Input';
import { Txt } from '../components/Txt';
import type { RootNavigation, RootStackParamList } from '../navigation/types';
import { useThemedStyles, type Theme } from '../theme/ThemeProvider';
import { useI18n } from '../i18n/I18nProvider';

type Limits = Record<CurrencyCode, string>;

/** One field per currency; an empty field means no budget in that currency. */
export default function BudgetFormScreen() {
  const db = useSQLiteContext();
  const navigation = useNavigation<RootNavigation>();
  const route = useRoute<RouteProp<RootStackParamList, 'BudgetForm'>>();
  const styles = useThemedStyles(makeStyles);
  const { t } = useI18n();
  const toast = useToast();
  const { categoryId, month } = route.params;

  const [name, setName] = useState('');
  const [limits, setLimits] = useState<Limits>({ EUR: '', IDR: '' });

  useEffect(() => {
    (async () => {
      const [category, lines] = await Promise.all([getCategory(db, categoryId), listCategoryBudgets(db, categoryId, month)]);
      setName(category?.name ?? '');
      navigation.setOptions({ title: category?.name ? t('budgetForm.title', { name: category.name }) : t('nav.budget') });
      const next: Limits = { EUR: '', IDR: '' };
      for (const line of lines) next[line.currency] = formatInputValue(line.limitMinor, line.currency);
      setLimits(next);
    })().catch(console.error);
  }, [db, categoryId, month, navigation, t]);

  // Checked as you type; an empty field is valid (no budget in that currency).
  const parsed: Partial<Record<CurrencyCode, number | null>> = {};
  const errors: Partial<Limits> = {};
  for (const currency of CURRENCY_CODES) {
    const text = limits[currency].trim();
    if (text === '') {
      parsed[currency] = null;
      continue;
    }
    const value = parseAmount(text, currency);
    if (value === null || value <= 0) errors[currency] = t('money.amountHint', { example: formatInputValue(currency === 'EUR' ? 30000 : 1_500_000, currency) });
    else parsed[currency] = value;
  }
  const canSave = Object.keys(errors).length === 0;

  const save = async () => {
    if (!canSave) return;
    try {
      for (const currency of CURRENCY_CODES) {
        const limitMinor = parsed[currency];
        if (limitMinor) await setBudget(db, { categoryId, month, currency, limitMinor });
        else await deleteBudget(db, { categoryId, month, currency });
      }
      navigation.goBack();
    } catch (e) {
      console.error(e);
      toast.show(t('budgetForm.saveFailed'), { tone: 'error' });
    }
  };

  return (
    <FormScroll contentContainerStyle={styles.content}>
      <Txt tone="inkMuted" style={styles.description}>
        {t('budgetForm.description', { name, month: formatMonthLabel(month) })}
      </Txt>
      {CURRENCY_CODES.map((currency) => (
        <Input
          key={currency}
          label={t('budgetForm.limit', { currency })}
          placeholder={formatInputValue(currency === 'EUR' ? 30000 : 1_500_000, currency)}
          value={limits[currency]}
          onChangeText={(text) => setLimits((current) => ({ ...current, [currency]: text }))}
          keyboardType={currency === 'EUR' ? 'decimal-pad' : 'number-pad'}
          error={errors[currency]}
        />
      ))}
      <Button title={t('common.save')} onPress={save} disabled={!canSave} style={styles.save} />
    </FormScroll>
  );
}

const makeStyles = ({ space }: Theme) =>
  StyleSheet.create({
    content: {
      padding: space.xl,
    },
    description: {
      marginBottom: space.lg,
    },
    save: {
      marginTop: space.lg,
    },
  });
