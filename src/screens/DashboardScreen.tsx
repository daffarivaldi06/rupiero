import React, { useState, useCallback, useEffect } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Pressable } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getBalancesByCurrency, listAccountsWithBalance } from '../db/repos/accounts';
import { getBaseCurrency } from '../db/repos/settings';
import { listCategories } from '../db/repos/categories';
import { getCategoryMonthTotals, getMonthSummary, type CategoryCurrencyTotal } from '../db/repos/reports';
import { currentMonth, formatDayMonth, formatMonthLabel, monthRange } from '../domain/dates';
import { combinedTotal } from '../domain/fx';
import type { CurrencyCode } from '../domain/money';
import type { AccountWithBalance, Category, CurrencyBalance, CurrencyTotals } from '../domain/types';
import { AppHeader } from '../components/AppHeader';
import { BalanceHero } from '../components/BalanceHero';
import { Money } from '../components/Money';
import { MonthFlow } from '../components/MonthFlow';
import { Txt } from '../components/Txt';
import { useReferenceRate } from '../fx/FxProvider';
import { useIntro } from '../intro/IntroProvider';
import { useQuickAdd } from '../quickadd/QuickAddProvider';
import { useTheme, useThemedStyles, type Theme } from '../theme/ThemeProvider';
import type { RootNavigation } from '../navigation/types';

export default function DashboardScreen() {
  const db = useSQLiteContext();
  const navigation = useNavigation<RootNavigation>();
  const { color } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { ready: introReady, roll } = useIntro();
  const quickAdd = useQuickAdd();
  const insets = useSafeAreaInsets();
  const referenceRate = useReferenceRate();

  const [balances, setBalances] = useState<CurrencyBalance[]>([]);
  const [accounts, setAccounts] = useState<AccountWithBalance[]>([]);
  const [baseCurrency, setBaseCurrency] = useState<CurrencyCode>('EUR');
  const [totals, setTotals] = useState<CurrencyTotals[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryTotals, setCategoryTotals] = useState<CategoryCurrencyTotal[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth());
  const [refreshing, setRefreshing] = useState(false);

  const isCurrentMonth = selectedMonth === currentMonth();

  const loadData = useCallback(async () => {
    try {
      const asOf = monthRange(selectedMonth).end;
      const [nextBalances, nextAccounts, nextBase, nextTotals, nextCategories, nextCategoryTotals] = await Promise.all([
        getBalancesByCurrency(db, { asOf }),
        listAccountsWithBalance(db, { asOf }),
        getBaseCurrency(db),
        getMonthSummary(db, selectedMonth),
        listCategories(db),
        getCategoryMonthTotals(db, selectedMonth),
      ]);
      setBalances(nextBalances);
      setAccounts(nextAccounts);
      setBaseCurrency(nextBase);
      setTotals(nextTotals);
      setCategories(nextCategories);
      setCategoryTotals(nextCategoryTotals);
    } catch (e) {
      console.error(e);
    } finally {
      introReady();
    }
  }, [db, selectedMonth, introReady]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  // The quick-add sheet opens over this screen, so focus does not change when it saves or deletes.
  useEffect(() => {
    if (quickAdd.revision > 0) loadData();
  }, [quickAdd.revision, loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const monthLabel = formatMonthLabel(selectedMonth);
  // Hidden until an ECB rate has been fetched at least once.
  const combined = referenceRate && balances.length > 1 ? combinedTotal(balances, baseCurrency, referenceRate.rateMicro) : null;
  const fees = totals.filter((t) => t.feeMinor > 0);

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
        <BalanceHero label={isCurrentMonth ? 'Saldo saat ini' : `Saldo akhir ${monthLabel}`} balances={balances} roll={roll} />
        {combined !== null && referenceRate && (
          <Txt variant="caption" tone="inkMuted" style={styles.combined}>
            ≈ <Money minor={combined} currency={baseCurrency} variant="caption" tone="inkMuted" /> total · kurs ECB{' '}
            {formatDayMonth(referenceRate.date)}
          </Txt>
        )}

        <View style={styles.section}>
          <MonthFlow title={`Arus ${monthLabel}`} totals={totals} />
          <Pressable
            onPress={() => navigation.navigate('Transactions', { month: selectedMonth })}
            style={styles.row}
            accessibilityRole="button"
          >
            <Txt variant="bodyStrong" style={styles.rowText}>Semua transaksi</Txt>
            <Txt tone="inkMuted" style={styles.chevron}>›</Txt>
          </Pressable>
        </View>

        <View style={styles.sectionHeader}>
          <Txt variant="title" style={styles.rowText}>Akun</Txt>
          <Pressable onPress={() => navigation.navigate('TransferForm')} style={styles.headerLink} accessibilityRole="button">
            <Txt variant="bodyStrong">Transfer</Txt>
          </Pressable>
          <Pressable onPress={() => navigation.navigate('Accounts')} style={styles.headerLink} accessibilityRole="button">
            <Txt variant="bodyStrong">Kelola</Txt>
          </Pressable>
        </View>
        <View style={styles.list}>
          {accounts.map((account) => (
            <Pressable
              key={account.id}
              onPress={() => navigation.navigate('Transactions', { month: selectedMonth, accountId: account.id })}
              style={styles.row}
              accessibilityRole="button"
            >
              <View style={styles.rowText}>
                <Txt numberOfLines={1}>{account.name}</Txt>
                <Txt variant="code" tone={account.currency === 'EUR' ? 'eur' : 'idrText'}>{account.currency}</Txt>
              </View>
              <Money
                minor={account.balanceMinor}
                currency={account.currency}
                variant="bodyStrong"
                tone={account.balanceMinor < 0 ? 'expense' : 'neutral'}
              />
              <Txt tone="inkMuted" style={styles.chevron}>›</Txt>
            </Pressable>
          ))}
        </View>

        <Txt variant="title" style={styles.sectionTitle}>Kategori</Txt>
        <View style={styles.list}>
          {categories.map((cat) => {
            const catTotals = categoryTotals.filter((t) => t.categoryId === cat.id);
            return (
              <Pressable
                key={cat.id}
                onPress={() => navigation.navigate('CategoryDetail', { categoryId: cat.id, month: selectedMonth })}
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
          {fees.length > 0 && (
            <View style={styles.row}>
              <Txt style={styles.rowText} numberOfLines={1}>Biaya transfer</Txt>
              <View style={styles.rowTotals}>
                {fees.map((t) => (
                  <Money key={t.currency} minor={-t.feeMinor} currency={t.currency} variant="label" tone="expense" />
                ))}
              </View>
              <View style={styles.chevronSpace} />
            </View>
          )}
          <Pressable onPress={() => navigation.navigate('CategoryForm')} style={styles.row} accessibilityRole="button">
            <Txt variant="bodyStrong">+ Tambah kategori</Txt>
          </Pressable>
        </View>
      </ScrollView>
      <Pressable
        onPress={() => quickAdd.open()}
        style={[styles.fab, { bottom: insets.bottom + 16 }]}
        accessibilityRole="button"
        accessibilityLabel="Catat transaksi"
      >
        <Txt variant="title" tone="onInk">+</Txt>
      </Pressable>
    </View>
  );
}

const makeStyles = ({ color, radius, space }: Theme) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: color.bg,
    },
    content: {
      paddingHorizontal: space.lg,
      paddingTop: space.md,
      // Room for the add button over the last row.
      paddingBottom: space.xxl + 64,
    },
    fab: {
      position: 'absolute',
      right: space.lg,
      width: 60,
      height: 60,
      borderRadius: radius.md,
      backgroundColor: color.ink,
      alignItems: 'center',
      justifyContent: 'center',
    },
    section: {
      marginTop: space.xl,
    },
    combined: {
      marginTop: space.sm,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: space.xl,
      marginBottom: space.xs,
    },
    headerLink: {
      minHeight: 44,
      justifyContent: 'center',
      paddingLeft: space.md,
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
    // Keeps fee amounts aligned with the chevron rows above.
    chevronSpace: {
      width: 14,
    },
  });
