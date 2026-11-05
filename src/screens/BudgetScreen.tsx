import React, { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSQLiteContext } from '../db/DatabaseProvider';
import { useFocusEffect, useNavigation, useRoute, type RouteProp } from '@react-navigation/native';

import { copyBudgetsFromPreviousMonth, listBudgets, type BudgetLine } from '../db/repos/budgets';
import { listCategories } from '../db/repos/categories';
import { budgetStatus, sortByHighestUsage } from '../domain/budget';
import { addMonths, currentMonth, formatMonthLabel, formatMonthName } from '../domain/dates';
import type { Category } from '../domain/types';
import { BudgetBar } from '../components/BudgetBar';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { DesktopHeader } from '../components/DesktopHeader';
import { Txt } from '../components/Txt';
import { LoadError } from '../components/LoadError';
import type { RootNavigation, RootStackParamList } from '../navigation/types';
import { useDesktopLayout } from '../navigation/useDesktopLayout';
import { useQuickAdd } from '../quickadd/QuickAddProvider';
import { useTheme, useThemedStyles, type Theme } from '../theme/ThemeProvider';
import { useReadableInset } from '../theme/layout';
import { space } from '../theme/tokens';
import { useI18n } from '../i18n/I18nProvider';
import { useToast } from '../feedback/ToastProvider';

export default function BudgetScreen() {
  const db = useSQLiteContext();
  const navigation = useNavigation<RootNavigation>();
  const route = useRoute<RouteProp<RootStackParamList, 'Budget'>>();
  const styles = useThemedStyles(makeStyles);
  const inset = useReadableInset(space.lg);
  const { t } = useI18n();
  const toast = useToast();
  const { layout } = useTheme();
  const quickAdd = useQuickAdd();
  // Web from 1024 px: desktop header and a grid of cards. Phones, Android and narrower windows keep the list.
  const wide = useDesktopLayout();

  const [month, setMonth] = useState(route.params?.month ?? currentMonth());
  const [categories, setCategories] = useState<Category[]>([]);
  const [budgets, setBudgets] = useState<BudgetLine[]>([]);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    try {
      const [nextCategories, nextBudgets] = await Promise.all([listCategories(db), listBudgets(db, month)]);
      setCategories(nextCategories);
      setBudgets(nextBudgets);
      setFailed(false);
    } catch (e) {
      console.error(e);
      setFailed(true);
    }
  }, [db, month]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const copyLabel = t('budget.copyFrom', { month: formatMonthName(addMonths(month, -1)) });

  const copyPrevious = async () => {
    try {
      const added = await copyBudgetsFromPreviousMonth(db, month);
      toast.show(
        added === 0
          ? t('budget.nothingCopied', { month: formatMonthName(addMonths(month, -1)) })
          : t('budget.copied', { month: formatMonthName(addMonths(month, -1)) }),
      );
      await load();
    } catch (e) {
      console.error(e);
      toast.show(t('budget.copyFailed'), { tone: 'error' });
    }
  };

  if (wide) {
    // Wide web (ADR 0001): a 2-column grid of cards, the most-used budgets first.
    const lines = (category: Category) => budgets.filter((b) => b.categoryId === category.id);
    return (
      <View style={styles.screen}>
        <DesktopHeader title={t('nav.budget')} month={month} onChangeMonth={setMonth} onAdd={() => quickAdd.open()} />
        <ScrollView contentContainerStyle={[styles.content, styles.wideContent, { maxWidth: layout.contentMaxWidth }]}>
          {failed && <LoadError onRetry={load} />}
          <Button title={copyLabel} variant="outline" onPress={copyPrevious} style={styles.copyWide} />
          <View style={styles.grid}>
            {sortByHighestUsage(categories, lines).map((category) => (
              <View key={category.id} style={styles.cell}>
                <Pressable onPress={() => navigation.navigate('BudgetForm', { categoryId: category.id, month })} style={styles.cellPress} accessibilityRole="button">
                  <Card style={styles.card}>
                    <View style={styles.rowHeader}>
                      <Txt variant="bodyStrong" style={styles.rowTitle} numberOfLines={1}>{category.name}</Txt>
                      <Txt tone="inkMuted">{lines(category).length === 0 ? t('common.setMore') : '›'}</Txt>
                    </View>
                    {lines(category).map((line) => (
                      <BudgetBar key={line.currency} status={budgetStatus(line.spentMinor, line.limitMinor)} currency={line.currency} />
                    ))}
                  </Card>
                </Pressable>
              </View>
            ))}
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={[styles.content, { paddingHorizontal: inset }]}>
      <View style={styles.monthRow}>
        <Pressable onPress={() => setMonth(addMonths(month, -1))} style={styles.monthButton} accessibilityRole="button" accessibilityLabel={t('common.previousMonth')}>
          <Txt variant="title">‹</Txt>
        </Pressable>
        <Txt variant="heading">{formatMonthLabel(month)}</Txt>
        <Pressable onPress={() => setMonth(addMonths(month, 1))} style={styles.monthButton} accessibilityRole="button" accessibilityLabel={t('common.nextMonth')}>
          <Txt variant="title">›</Txt>
        </Pressable>
      </View>

      {failed && <LoadError onRetry={load} />}
      <Button title={copyLabel} variant="outline" onPress={copyPrevious} />

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
                <Txt tone="inkMuted">{lines.length === 0 ? t('common.setMore') : '›'}</Txt>
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
    // Wide web only.
    screen: {
      flex: 1,
      backgroundColor: color.bg,
    },
    wideContent: {
      width: '100%',
      alignSelf: 'center',
      paddingHorizontal: space.xl,
    },
    copyWide: {
      alignSelf: 'flex-start',
    },
    // Two equal columns: each cell is half the row, the gap comes from the cells' padding.
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginTop: space.md,
      marginHorizontal: -space.sm,
    },
    cell: {
      width: '50%',
      paddingHorizontal: space.sm,
      marginBottom: space.lg,
    },
    cellPress: {
      flex: 1,
    },
    card: {
      flex: 1,
      marginVertical: 0,
      gap: space.xs,
    },
  });
