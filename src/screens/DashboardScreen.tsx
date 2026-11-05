import React, { useState, useCallback, useEffect } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Pressable, Platform } from 'react-native';
import { useSQLiteContext } from '../db/DatabaseProvider';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getBalancesByCurrency, listAccountsWithBalance } from '../db/repos/accounts';
import { listBudgets, type BudgetLine } from '../db/repos/budgets';
import { getBaseCurrency } from '../db/repos/settings';
import { dismissSampleData, loadSampleData, shouldOfferSampleData } from '../db/repos/sampleData';
import { listCategories } from '../db/repos/categories';
import { getCategoryMonthTotals, getMonthSummary, type CategoryCurrencyTotal } from '../db/repos/reports';
import { currentMonth, formatDayMonth, formatMonthLabel, monthRange } from '../domain/dates';
import { budgetStatus } from '../domain/budget';
import { combinedTotal } from '../domain/fx';
import type { CurrencyCode } from '../domain/money';
import type { AccountWithBalance, Category, CurrencyBalance, CurrencyTotals } from '../domain/types';
import { AppHeader } from '../components/AppHeader';
import { BalanceHero } from '../components/BalanceHero';
import { BudgetBar } from '../components/BudgetBar';
import { CombinedTotal } from '../components/CombinedTotal';
import { SampleDataOffer } from '../components/SampleDataOffer';
import { useToast } from '../feedback/ToastProvider';
import { Money } from '../components/Money';
import { MonthFlow } from '../components/MonthFlow';
import { LoadError } from '../components/LoadError';
import { Txt } from '../components/Txt';
import { useReferenceRate } from '../fx/FxProvider';
import { useIntro } from '../intro/IntroProvider';
import { useDataRevision } from '../data/DataProvider';
import { useQuickAdd } from '../quickadd/QuickAddProvider';
import { useTheme, useThemedStyles, type Theme } from '../theme/ThemeProvider';
import { useReadableInset } from '../theme/layout';
import { space } from '../theme/tokens';
import { useI18n } from '../i18n/I18nProvider';
import { renderMessage } from '../i18n/rich';
import type { RootNavigation } from '../navigation/types';

export default function DashboardScreen() {
  const db = useSQLiteContext();
  const navigation = useNavigation<RootNavigation>();
  const { color } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const inset = useReadableInset(space.lg);
  const { t } = useI18n();
  const { ready: introReady, roll } = useIntro();
  const quickAdd = useQuickAdd();
  const { revision } = useDataRevision();
  const insets = useSafeAreaInsets();
  const referenceRate = useReferenceRate();
  const toast = useToast();

  const [balances, setBalances] = useState<CurrencyBalance[]>([]);
  // Web only: the first-launch offer to try the app with sample data.
  const [offerSample, setOfferSample] = useState(false);
  const [accounts, setAccounts] = useState<AccountWithBalance[]>([]);
  const [baseCurrency, setBaseCurrency] = useState<CurrencyCode>('EUR');
  const [totals, setTotals] = useState<CurrencyTotals[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryTotals, setCategoryTotals] = useState<CategoryCurrencyTotal[]>([]);
  const [budgets, setBudgets] = useState<BudgetLine[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth());
  const [refreshing, setRefreshing] = useState(false);
  const [failed, setFailed] = useState(false);

  const isCurrentMonth = selectedMonth === currentMonth();

  const loadData = useCallback(async () => {
    try {
      const asOf = monthRange(selectedMonth).end;
      const [nextBalances, nextAccounts, nextBase, nextTotals, nextCategories, nextCategoryTotals, nextBudgets, nextOffer] = await Promise.all([
        getBalancesByCurrency(db, { asOf }),
        listAccountsWithBalance(db, { asOf }),
        getBaseCurrency(db),
        getMonthSummary(db, selectedMonth),
        listCategories(db),
        getCategoryMonthTotals(db, selectedMonth),
        listBudgets(db, selectedMonth),
        Platform.OS === 'web' ? shouldOfferSampleData(db) : Promise.resolve(false),
      ]);
      setOfferSample(nextOffer);
      setBudgets(nextBudgets);
      setBalances(nextBalances);
      setAccounts(nextAccounts);
      setBaseCurrency(nextBase);
      setTotals(nextTotals);
      setCategories(nextCategories);
      setCategoryTotals(nextCategoryTotals);
      setFailed(false);
    } catch (e) {
      console.error(e);
      setFailed(true);
    } finally {
      introReady();
    }
  }, [db, selectedMonth, introReady]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  // The quick-add sheet opens over this screen and recurring transactions appear in the background,
  // so focus alone does not catch every change.
  useEffect(() => {
    if (revision > 0) loadData();
  }, [revision, loadData]);

  const loadSample = async () => {
    setOfferSample(false);
    try {
      await loadSampleData(db);
    } catch (e) {
      console.error(e);
      setOfferSample(true);
      toast.show(t('sampleOffer.failed'), { tone: 'error' });
    }
  };

  const dismissSample = () => {
    setOfferSample(false);
    dismissSampleData(db).catch(console.error);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const monthLabel = formatMonthLabel(selectedMonth);
  // Hidden until an ECB rate has been fetched at least once.
  const combined = referenceRate && balances.length > 1 ? combinedTotal(balances, baseCurrency, referenceRate.rateMicro) : null;
  const fees = totals.filter((total) => total.feeMinor > 0);
  // Only budgets that need attention (≥ 80 %) are shown here; the budget screen has the rest.
  const budgetAlerts = budgets
    .map((line) => ({ line, status: budgetStatus(line.spentMinor, line.limitMinor) }))
    .filter(({ status }) => status.level !== 'ok');

  return (
    <View style={styles.screen}>
      <AppHeader
        month={selectedMonth}
        onChangeMonth={setSelectedMonth}
        onPressSettings={() => navigation.navigate('Settings')}
      />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingHorizontal: inset }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={color.ink} />}
      >
        {failed && <LoadError onRetry={loadData} />}
        {offerSample && <SampleDataOffer onLoad={loadSample} onDismiss={dismissSample} style={styles.offer} />}
        <BalanceHero label={isCurrentMonth ? t('dashboard.balanceNow') : t('dashboard.balanceEnd', { month: monthLabel })} balances={balances} roll={roll} />
        {Platform.OS === 'web' ? (
          // Web (ADR 0001): the total in the chosen base currency, whenever there is a balance, and a
          // message instead of the figure until an ECB rate has been fetched.
          balances.length > 0 && (
            <CombinedTotal balances={balances} base={baseCurrency} rate={referenceRate} style={styles.total} />
          )
        ) : (
          combined !== null &&
          referenceRate && (
            <Txt variant="caption" tone="inkMuted" style={styles.combined}>
              {renderMessage('dashboard.combined', {
                amount: <Money minor={combined} currency={baseCurrency} variant="caption" tone="inkMuted" />,
                date: formatDayMonth(referenceRate.date),
              })}
            </Txt>
          )
        )}

        <View style={styles.section}>
          <MonthFlow title={t('dashboard.flow', { month: monthLabel })} totals={totals} />
          <Pressable
            onPress={() => navigation.navigate('Transactions', { month: selectedMonth })}
            style={styles.row}
            accessibilityRole="button"
          >
            <Txt variant="bodyStrong" style={styles.rowText}>{t('dashboard.allTransactions')}</Txt>
            <Txt tone="inkMuted" style={styles.chevron}>›</Txt>
          </Pressable>
          <Pressable
            onPress={() => navigation.navigate('Insights', { month: selectedMonth })}
            style={styles.row}
            accessibilityRole="button"
          >
            <Txt variant="bodyStrong" style={styles.rowText}>{t('dashboard.charts')}</Txt>
            <Txt tone="inkMuted" style={styles.chevron}>›</Txt>
          </Pressable>
        </View>

        <View style={styles.sectionHeader}>
          <Txt variant="title" style={styles.rowText}>{t('common.budget')}</Txt>
          <Pressable
            onPress={() => navigation.navigate('Budget', { month: selectedMonth })}
            style={styles.headerLink}
            accessibilityRole="button"
          >
            <Txt variant="bodyStrong">{t(budgets.length === 0 ? 'common.set' : 'common.all')}</Txt>
          </Pressable>
        </View>
        <View style={styles.list}>
          {budgets.length === 0 ? (
            <Txt tone="inkMuted" style={styles.note}>{t('dashboard.noBudgets')}</Txt>
          ) : budgetAlerts.length === 0 ? (
            <Txt tone="inkMuted" style={styles.note}>{t('dashboard.budgetsFine')}</Txt>
          ) : (
            budgetAlerts.map(({ line, status }) => (
              <Pressable
                key={`${line.categoryId}-${line.currency}`}
                onPress={() => navigation.navigate('CategoryDetail', { categoryId: line.categoryId, month: selectedMonth })}
                style={styles.budgetRow}
                accessibilityRole="button"
              >
                <Txt variant="bodyStrong" numberOfLines={1}>{line.categoryName}</Txt>
                <BudgetBar status={status} currency={line.currency} />
              </Pressable>
            ))
          )}
        </View>

        <View style={styles.sectionHeader}>
          <Txt variant="title" style={styles.rowText}>{t('nav.accounts')}</Txt>
          <Pressable onPress={() => navigation.navigate('TransferForm')} style={styles.headerLink} accessibilityRole="button">
            <Txt variant="bodyStrong">{t('common.transfer')}</Txt>
          </Pressable>
          <Pressable onPress={() => navigation.navigate('Accounts')} style={styles.headerLink} accessibilityRole="button">
            <Txt variant="bodyStrong">{t('common.manage')}</Txt>
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

        <Txt variant="title" style={styles.sectionTitle}>{t('nav.categories')}</Txt>
        <View style={styles.list}>
          {categories.map((cat) => {
            const catTotals = categoryTotals.filter((total) => total.categoryId === cat.id);
            return (
              <Pressable
                key={cat.id}
                onPress={() => navigation.navigate('CategoryDetail', { categoryId: cat.id, month: selectedMonth })}
                style={styles.row}
                accessibilityRole="button"
              >
                <Txt style={styles.rowText} numberOfLines={1}>{cat.name}</Txt>
                <View style={styles.rowTotals}>
                  {catTotals.map((total) => (
                    <Money key={total.currency} minor={total.netMinor} currency={total.currency} variant="label" tone="signed" sign />
                  ))}
                </View>
                <Txt tone="inkMuted" style={styles.chevron}>›</Txt>
              </Pressable>
            );
          })}
          {fees.length > 0 && (
            <View style={styles.row}>
              <Txt style={styles.rowText} numberOfLines={1}>{t('common.transferFee')}</Txt>
              <View style={styles.rowTotals}>
                {fees.map((fee) => (
                  <Money key={fee.currency} minor={-fee.feeMinor} currency={fee.currency} variant="label" tone="expense" />
                ))}
              </View>
              <View style={styles.chevronSpace} />
            </View>
          )}
          <Pressable onPress={() => navigation.navigate('CategoryForm')} style={styles.row} accessibilityRole="button">
            <Txt variant="bodyStrong">{t('categories.add')}</Txt>
          </Pressable>
        </View>
      </ScrollView>
      <Pressable
        onPress={() => quickAdd.open()}
        style={[styles.fab, { bottom: insets.bottom + 16 }]}
        accessibilityRole="button"
        accessibilityLabel={t('dashboard.add')}
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
    total: {
      marginTop: space.lg,
    },
    offer: {
      marginBottom: space.lg,
    },
    note: {
      paddingVertical: space.md,
    },
    budgetRow: {
      paddingVertical: space.sm,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: color.line,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: space.xl,
      marginBottom: space.xs,
    },
    headerLink: {
      minHeight: 48,
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
