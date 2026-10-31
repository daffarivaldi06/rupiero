import React, { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useFocusEffect, useNavigation, useRoute, type RouteProp } from '@react-navigation/native';

import { copyBudgetsFromPreviousMonth, listBudgets, type BudgetLine } from '../db/repos/budgets';
import { listCategories } from '../db/repos/categories';
import { budgetStatus } from '../domain/budget';
import { addMonths, currentMonth, formatMonthLabel, formatMonthName } from '../domain/dates';
import type { Category } from '../domain/types';
import { BudgetBar } from '../components/BudgetBar';
import { Button } from '../components/Button';
import { Txt } from '../components/Txt';
import type { RootNavigation, RootStackParamList } from '../navigation/types';
import { useThemedStyles, type Theme } from '../theme/ThemeProvider';

export default function BudgetScreen() {
  const db = useSQLiteContext();
  const navigation = useNavigation<RootNavigation>();
  const route = useRoute<RouteProp<RootStackParamList, 'Budget'>>();
  const styles = useThemedStyles(makeStyles);

  const [month, setMonth] = useState(route.params?.month ?? currentMonth());
  const [categories, setCategories] = useState<Category[]>([]);
  const [budgets, setBudgets] = useState<BudgetLine[]>([]);

  const load = useCallback(async () => {
    try {
      const [nextCategories, nextBudgets] = await Promise.all([listCategories(db), listBudgets(db, month)]);
      setCategories(nextCategories);
      setBudgets(nextBudgets);
    } catch (e) {
      console.error(e);
    }
  }, [db, month]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const copyPrevious = async () => {
    try {
      const added = await copyBudgetsFromPreviousMonth(db, month);
      if (added === 0) Alert.alert('Tidak ada yang disalin', `Budget ${formatMonthName(addMonths(month, -1))} kosong atau sudah ada di bulan ini.`);
      await load();
    } catch (e) {
      console.error(e);
      Alert.alert('Gagal', 'Budget tidak dapat disalin');
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.monthRow}>
        <Pressable onPress={() => setMonth(addMonths(month, -1))} style={styles.monthButton} accessibilityRole="button" accessibilityLabel="Bulan sebelumnya">
          <Txt variant="title">‹</Txt>
        </Pressable>
        <Txt variant="heading">{formatMonthLabel(month)}</Txt>
        <Pressable onPress={() => setMonth(addMonths(month, 1))} style={styles.monthButton} accessibilityRole="button" accessibilityLabel="Bulan berikutnya">
          <Txt variant="title">›</Txt>
        </Pressable>
      </View>

      <Button title={`Salin dari ${formatMonthName(addMonths(month, -1))}`} variant="outline" onPress={copyPrevious} />

      <View style={styles.list}>
        {categories.map((category) => {
          const lines = budgets.filter((b) => b.categoryId === category.id);
          return (
            <Pressable
              key={category.id}
              onPress={() => navigation.navigate('BudgetForm', { categoryId: category.id, month })}
              style={styles.row}
              accessibilityRole="button"
            >
              <View style={styles.rowHeader}>
                <Txt variant="bodyStrong" style={styles.rowTitle} numberOfLines={1}>{category.name}</Txt>
                <Txt tone="inkMuted">{lines.length === 0 ? 'Atur ›' : '›'}</Txt>
              </View>
              {lines.map((line) => (
                <BudgetBar key={line.currency} status={budgetStatus(line.spentMinor, line.limitMinor)} currency={line.currency} />
              ))}
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}

const makeStyles = ({ color, space }: Theme) =>
  StyleSheet.create({
    content: {
      padding: space.lg,
      paddingBottom: space.xxl,
    },
    monthRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    monthButton: {
      minWidth: 48,
      minHeight: 48,
      alignItems: 'center',
      justifyContent: 'center',
    },
    list: {
      marginTop: space.md,
      borderTopWidth: 1,
      borderTopColor: color.ink,
    },
    row: {
      paddingVertical: space.sm,
      minHeight: 52,
      justifyContent: 'center',
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: color.line,
    },
    rowHeader: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    rowTitle: {
      flex: 1,
    },
  });
