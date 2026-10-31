import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet } from 'react-native';
import { useSQLiteContext } from '../db/DatabaseProvider';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';

import { deleteBudget, listCategoryBudgets, setBudget } from '../db/repos/budgets';
import { getCategory } from '../db/repos/categories';
import { formatMonthLabel } from '../domain/dates';
import { CURRENCY_CODES, formatInputValue, parseAmount, type CurrencyCode } from '../domain/money';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Txt } from '../components/Txt';
import type { RootNavigation, RootStackParamList } from '../navigation/types';
import { useThemedStyles, type Theme } from '../theme/ThemeProvider';

type Limits = Record<CurrencyCode, string>;

/** One field per currency; an empty field means no budget in that currency. */
export default function BudgetFormScreen() {
  const db = useSQLiteContext();
  const navigation = useNavigation<RootNavigation>();
  const route = useRoute<RouteProp<RootStackParamList, 'BudgetForm'>>();
  const styles = useThemedStyles(makeStyles);
  const { categoryId, month } = route.params;

  const [name, setName] = useState('');
  const [limits, setLimits] = useState<Limits>({ EUR: '', IDR: '' });
  const [errors, setErrors] = useState<Partial<Limits>>({});

  useEffect(() => {
    (async () => {
      const [category, lines] = await Promise.all([getCategory(db, categoryId), listCategoryBudgets(db, categoryId, month)]);
      setName(category?.name ?? '');
      navigation.setOptions({ title: category?.name ? `Budget ${category.name}` : 'Budget' });
      const next: Limits = { EUR: '', IDR: '' };
      for (const line of lines) next[line.currency] = formatInputValue(line.limitMinor, line.currency);
      setLimits(next);
    })().catch(console.error);
  }, [db, categoryId, month, navigation]);

  const save = async () => {
    const parsed: Partial<Record<CurrencyCode, number | null>> = {};
    const nextErrors: Partial<Limits> = {};
    for (const currency of CURRENCY_CODES) {
      const text = limits[currency].trim();
      if (text === '') {
        parsed[currency] = null;
        continue;
      }
      const value = parseAmount(text, currency);
      if (value === null || value <= 0) nextErrors[currency] = currency === 'EUR' ? 'Contoh: 300 atau 300,00' : 'Contoh: 1.500.000';
      else parsed[currency] = value;
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    try {
      for (const currency of CURRENCY_CODES) {
        const limitMinor = parsed[currency];
        if (limitMinor) await setBudget(db, { categoryId, month, currency, limitMinor });
        else await deleteBudget(db, { categoryId, month, currency });
      }
      navigation.goBack();
    } catch (e) {
      console.error(e);
      Alert.alert('Gagal', 'Budget tidak dapat disimpan');
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Txt tone="inkMuted" style={styles.description}>
        Batas pengeluaran {name} untuk {formatMonthLabel(month)}, terpisah per mata uang. Kosongkan untuk tanpa budget.
      </Txt>
      {CURRENCY_CODES.map((currency) => (
        <Input
          key={currency}
          label={`Budget ${currency}`}
          placeholder={currency === 'EUR' ? '300,00' : '1.500.000'}
          value={limits[currency]}
          onChangeText={(text) => setLimits((current) => ({ ...current, [currency]: text }))}
          keyboardType={currency === 'EUR' ? 'decimal-pad' : 'number-pad'}
          error={errors[currency]}
        />
      ))}
      <Button title="Simpan" onPress={save} style={styles.save} />
    </ScrollView>
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
