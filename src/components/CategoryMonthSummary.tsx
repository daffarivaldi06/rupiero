import React from 'react';
import { View, StyleSheet } from 'react-native';
import { formatMonthName, type Month } from '../domain/dates';
import type { CurrencyTotals } from '../domain/types';
import { useThemedStyles, type Theme } from '../theme/ThemeProvider';
import { Money } from './Money';
import { Txt } from './Txt';
import { useI18n } from '../i18n/I18nProvider';

interface CategoryMonthSummaryProps {
  month: Month;
  totals: CurrencyTotals[];
}

/**
 * A category's month per currency, ruled like the dashboard. One-sided currencies show a single big
 * unsigned amount ("Pengeluaran Oktober € 178,70"); mixed ones list both sides and the difference.
 * Currencies without activity are left out.
 */
export const CategoryMonthSummary: React.FC<CategoryMonthSummaryProps> = ({ month, totals }) => {
  const styles = useThemedStyles(makeStyles);
  const { t, locale } = useI18n();
  const active = totals.filter((row) => row.incomeMinor !== 0 || row.expenseMinor !== 0);
  if (active.length === 0) return null;

  const monthName = formatMonthName(month, locale);
  return (
    <View>
      <View style={styles.topRule} />
      {active.map((row, index) => {
        const code = (
          <Txt variant="code" tone={row.currency === 'EUR' ? 'eur' : 'idrText'}>{row.currency}</Txt>
        );
        if (row.incomeMinor === 0 || row.expenseMinor === 0) {
          const isIncome = row.expenseMinor === 0;
          return (
            <View key={row.currency} style={[styles.block, index > 0 && styles.divider]}>
              {code}
              <Txt variant="label" tone="inkMuted">{t(isIncome ? 'categorySummary.incomeIn' : 'categorySummary.expenseIn', { month: monthName })}</Txt>
              <Money minor={isIncome ? row.incomeMinor : row.expenseMinor} currency={row.currency} variant="display" />
            </View>
          );
        }
        return (
          <View key={row.currency} style={[styles.block, index > 0 && styles.divider]}>
            {code}
            <View style={styles.line}>
              <Txt tone="inkMuted">{t('categorySummary.incomeIn', { month: monthName })}</Txt>
              <Money minor={row.incomeMinor} currency={row.currency} variant="bodyStrong" />
            </View>
            <View style={styles.line}>
              <Txt tone="inkMuted">{t('categorySummary.expenseIn', { month: monthName })}</Txt>
              <Money minor={row.expenseMinor} currency={row.currency} variant="bodyStrong" />
            </View>
            <View style={[styles.line, styles.totalLine]}>
              <Txt variant="bodyStrong">{t('categorySummary.difference')}</Txt>
              <Money minor={row.incomeMinor - row.expenseMinor} currency={row.currency} variant="heading" tone="signed" sign />
            </View>
          </View>
        );
      })}
      <View style={styles.doubleRule} />
    </View>
  );
};

const makeStyles = ({ color, space }: Theme) =>
  StyleSheet.create({
    topRule: {
      height: 1,
      backgroundColor: color.ink,
    },
    block: {
      paddingTop: space.md,
      paddingBottom: space.sm,
    },
    divider: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: color.line,
    },
    line: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      minHeight: 32,
    },
    totalLine: {
      marginTop: space.xs,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: color.line,
    },
    doubleRule: {
      height: 4,
      borderTopWidth: 1,
      borderBottomWidth: 1,
      borderColor: color.ink,
    },
  });
