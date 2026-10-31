import React, { useState, useCallback, useEffect, useLayoutEffect } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Pressable, Alert } from 'react-native';
import { useSQLiteContext } from '../db/DatabaseProvider';
import { useFocusEffect, useRoute, useNavigation, RouteProp } from '@react-navigation/native';

import { countCategoryTransactions, deleteCategory, getCategory, setCategoryArchived } from '../db/repos/categories';
import { listCategoryBudgets, type BudgetLine } from '../db/repos/budgets';
import { getMonthSummary } from '../db/repos/reports';
import { listTransactions } from '../db/repos/transactions';
import { budgetStatus } from '../domain/budget';
import { groupByDate } from '../domain/ledger';
import type { CurrencyTotals, TransactionDetail } from '../domain/types';
import { BudgetBar } from '../components/BudgetBar';
import { Button } from '../components/Button';
import { LedgerRow } from '../components/LedgerRow';
import { LedgerSection } from '../components/LedgerSection';
import { CategoryMonthSummary } from '../components/CategoryMonthSummary';
import { Txt } from '../components/Txt';
import { LoadError } from '../components/LoadError';
import { useTheme, useThemedStyles, type Theme } from '../theme/ThemeProvider';
import { useReadableInset } from '../theme/layout';
import { space } from '../theme/tokens';
import { useI18n } from '../i18n/I18nProvider';
import { useToast } from '../feedback/ToastProvider';
import type { RootNavigation, RootStackParamList } from '../navigation/types';
import { useDataRevision } from '../data/DataProvider';
import { useQuickAdd } from '../quickadd/QuickAddProvider';

const signed = (tx: TransactionDetail) => (tx.type === 'income' ? tx.amountMinor : -tx.amountMinor);

export default function CategoryDetailScreen() {
  const db = useSQLiteContext();
  const route = useRoute<RouteProp<RootStackParamList, 'CategoryDetail'>>();
  const navigation = useNavigation<RootNavigation>();
  const { color } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const inset = useReadableInset(space.lg);
  const { t } = useI18n();
  const toast = useToast();
  const { categoryId, month } = route.params;
  const quickAdd = useQuickAdd();
  const { revision } = useDataRevision();

  const [category, setCategory] = useState('');
  const [totals, setTotals] = useState<CurrencyTotals[]>([]);
  const [budgets, setBudgets] = useState<BudgetLine[]>([]);
  const [transactions, setTransactions] = useState<TransactionDetail[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [failed, setFailed] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const found = await getCategory(db, categoryId);
      if (!found) {
        // Deleted elsewhere: nothing left to show.
        navigation.popTo('Dashboard');
        return;
      }
      setCategory(found.name);
      setBudgets(await listCategoryBudgets(db, categoryId, month));
      setTotals(await getMonthSummary(db, month, { categoryId }));
      setTransactions(await listTransactions(db, { month, categoryId }));
      setFailed(false);
    } catch (e) {
      console.error(e);
      setFailed(true);
    }
  }, [db, month, categoryId, navigation]);

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

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  // Transactions are never deleted with their category: an unused one goes, a used one is moved or archived.
  const handleDelete = async () => {
    const run = (action: () => Promise<void>) => async () => {
      try {
        await action();
        navigation.popTo('Dashboard');
      } catch (e) {
        console.error(e);
        toast.show(t('categoryDetail.changeFailed'), { tone: 'error' });
      }
    };
    const used = await countCategoryTransactions(db, categoryId);
    if (used === 0) {
      Alert.alert(t('categoryDetail.deleteTitle'), t('categoryDetail.deleteMessage', { name: category }), [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('common.delete'), style: 'destructive', onPress: run(() => deleteCategory(db, categoryId)) },
      ]);
      return;
    }
    Alert.alert(
      t('categoryDetail.inUseTitle'),
      t('categoryDetail.inUseMessage', { count: used, name: category }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('categoryDetail.archive'), onPress: run(() => setCategoryArchived(db, categoryId, true)) },
        { text: t('categoryDetail.move'), onPress: () => navigation.navigate('CategoryReassign', { categoryId }) },
      ],
    );
  };

  useLayoutEffect(() => {
    navigation.setOptions({
      title: category,
      headerRight: () => (
        <View style={styles.headerActions}>
          <Pressable
            onPress={() => navigation.navigate('CategoryForm', { categoryId })}
            style={styles.headerButton}
            accessibilityRole="button"
          >
            <Txt variant="bodyStrong">{t('common.edit')}</Txt>
          </Pressable>
          <Pressable onPress={handleDelete} style={styles.headerButton} accessibilityRole="button">
            <Txt variant="bodyStrong" tone="expense">{t('common.delete')}</Txt>
          </Pressable>
        </View>
      ),
    });
  });

  const days = groupByDate(transactions, (tx) => ({ date: tx.date, currency: tx.currency, signedMinor: signed(tx) }));

  return (
    <ScrollView
      contentContainerStyle={[styles.content, { paddingHorizontal: inset }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={color.ink} />}
    >
      {failed && <LoadError onRetry={loadData} />}
      <CategoryMonthSummary month={month} totals={totals} />

      <Pressable
        onPress={() => navigation.navigate('BudgetForm', { categoryId, month })}
        style={styles.budgetBlock}
        accessibilityRole="button"
      >
        <View style={styles.budgetHeader}>
          <Txt variant="label" tone="inkMuted">{t('common.budget')}</Txt>
          <Txt variant="label">{t(budgets.length === 0 ? 'common.setMore' : 'common.editMore')}</Txt>
        </View>
        {budgets.map((line) => (
          <BudgetBar key={line.currency} status={budgetStatus(line.spentMinor, line.limitMinor)} currency={line.currency} />
        ))}
      </Pressable>

      <View style={styles.actionRow}>
        <Button
          title={t('categoryDetail.addIncome')}
          variant="outline"
          onPress={() => quickAdd.open({ categoryId, type: 'income' })}
          style={styles.actionButton}
        />
        <Button
          title={t('categoryDetail.addExpense')}
          variant="outline"
          onPress={() => quickAdd.open({ categoryId, type: 'expense' })}
          style={styles.actionButton}
        />
      </View>

      <Txt variant="title" style={styles.sectionTitle}>{t('common.transactions')}</Txt>
      {days.length === 0 ? (
        <Txt tone="inkMuted" style={styles.emptyText}>{t('categoryDetail.empty')}</Txt>
      ) : (
        days.map((day) => (
          <LedgerSection key={day.date} date={day.date} totals={day.items.length > 1 ? day.totals : undefined}>
            {day.items.map((tx) => (
              <LedgerRow
                key={tx.id}
                title={tx.note || undefined}
                subtitle={tx.accountName}
                signedMinor={signed(tx)}
                currency={tx.currency}
                onPress={() => quickAdd.open({ transactionId: tx.id })}
              />
            ))}
          </LedgerSection>
        ))
      )}
    </ScrollView>
  );
}

const makeStyles = ({ color, space }: Theme) =>
  StyleSheet.create({
    content: {
      padding: space.lg,
      paddingBottom: space.xxl,
    },
    headerActions: {
      flexDirection: 'row',
    },
    budgetBlock: {
      marginTop: space.md,
      paddingVertical: space.sm,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: color.line,
    },
    budgetHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      minHeight: 32,
      alignItems: 'center',
    },
    headerButton: {
      minHeight: 48,
      justifyContent: 'center',
      paddingHorizontal: space.sm,
    },
    actionRow: {
      flexDirection: 'row',
      gap: space.md,
      marginTop: space.lg,
    },
    actionButton: {
      flex: 1,
    },
    sectionTitle: {
      marginTop: space.xl,
      marginBottom: space.sm,
    },
    emptyText: {
      marginTop: space.sm,
    },
  });
