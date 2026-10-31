import React, { useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Pressable } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { getBalancesByCurrency } from '../db/repos/accounts';
import { listCategories } from '../db/repos/categories';
import { getCategoryMonthTotals, getMonthSummary, type CategoryCurrencyTotal } from '../db/repos/reports';
import { currentMonth, formatMonthLabel, monthRange } from '../domain/dates';
import type { Category, CurrencyBalance, CurrencyTotals } from '../domain/types';
import { AppHeader } from '../components/AppHeader';
import { BalanceHero } from '../components/BalanceHero';
import { Money } from '../components/Money';
import { MonthFlow } from '../components/MonthFlow';
import { Txt } from '../components/Txt';
import { useTheme, useThemedStyles, type Theme } from '../theme/ThemeProvider';
import { RootStackParamList } from '../../App';

export default function DashboardScreen() {
  const db = useSQLiteContext();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { color } = useTheme();
  const styles = useThemedStyles(makeStyles);

  const [balances, setBalances] = useState<CurrencyBalance[]>([]);
  const [totals, setTotals] = useState<CurrencyTotals[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryTotals, setCategoryTotals] = useState<CategoryCurrencyTotal[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth());
  const [refreshing, setRefreshing] = useState(false);

  const isCurrentMonth = selectedMonth === currentMonth();

  const loadData = useCallback(async () => {
    try {
      const [nextBalances, nextTotals, nextCategories, nextCategoryTotals] = await Promise.all([
        getBalancesByCurrency(db, { asOf: monthRange(selectedMonth).end }),
        getMonthSummary(db, selectedMonth),
        listCategories(db),
        getCategoryMonthTotals(db, selectedMonth),
      ]);
      setBalances(nextBalances);
      setTotals(nextTotals);
      setCategories(nextCategories);
      setCategoryTotals(nextCategoryTotals);
    } catch (e) {
      console.error(e);
    }
  }, [db, selectedMonth]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const monthLabel = formatMonthLabel(selectedMonth);

  return (
    <View style={styles.screen}>
      <AppHeader
        month={selectedMonth}
        onChangeMonth={setSelectedMonth}
        onPressSettings={() => navigation.navigate('Settings')}
      />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={color.ink} />}
      >
        <BalanceHero label={isCurrentMonth ? 'Saldo saat ini' : `Saldo akhir ${monthLabel}`} balances={balances} />

        <View style={styles.section}>
          <MonthFlow title={`Arus ${monthLabel}`} totals={totals} />
        </View>

        <Txt variant="title" style={styles.sectionTitle}>Kategori</Txt>
        <View style={styles.list}>
          {categories.map((cat) => {
            const catTotals = categoryTotals.filter((t) => t.categoryId === cat.id);
            return (
              <Pressable
                key={cat.id}
                onPress={() => navigation.navigate('CategoryDetail', { category: cat.name, categoryId: cat.id })}
                style={styles.row}
                accessibilityRole="button"
              >
                <Txt style={styles.rowText} numberOfLines={1}>{cat.name}</Txt>
                <View style={styles.rowTotals}>
                  {catTotals.map((t) => (
                    <Money key={t.currency} minor={t.netMinor} currency={t.currency} variant="label" tone="signed" sign />
                  ))}
                </View>
                <Txt tone="inkMuted" style={styles.chevron}>›</Txt>
              </Pressable>
            );
          })}
          <Pressable onPress={() => navigation.navigate('CategoryForm')} style={styles.row} accessibilityRole="button">
            <Txt variant="bodyStrong">+ Tambah kategori</Txt>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const makeStyles = ({ color, space }: Theme) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: color.bg,
    },
    content: {
      paddingHorizontal: space.lg,
      paddingTop: space.md,
      paddingBottom: space.xxl,
    },
    section: {
      marginTop: space.xl,
    },
    sectionTitle: {
      marginTop: space.xl,
      marginBottom: space.xs,
    },
    list: {
      borderTopWidth: 1,
      borderTopColor: color.ink,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: 52,
      paddingVertical: space.xs,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: color.line,
    },
    rowText: {
      flex: 1,
      marginRight: space.sm,
    },
    rowTotals: {
      alignItems: 'flex-end',
    },
    chevron: {
      marginLeft: space.sm,
    },
  });
