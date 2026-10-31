import React from 'react';
import { View, StyleSheet } from 'react-native';
import { formatMonthName, type Month } from '../domain/dates';
import type { CurrencyTotals } from '../domain/types';
import { useThemedStyles, type Theme } from '../theme/ThemeProvider';
import { Money } from './Money';
import { Txt } from './Txt';

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
  const active = totals.filter((t) => t.incomeMinor !== 0 || t.expenseMinor !== 0);
  if (active.length === 0) return null;

  const monthName = formatMonthName(month);
  return (
    <View>
      <View style={styles.topRule} />
      {active.map((t, index) => {
        const code = (
          <Txt variant="code" tone={t.currency === 'EUR' ? 'eur' : 'idrText'}>{t.currency}</Txt>
        );
        if (t.incomeMinor === 0 || t.expenseMinor === 0) {
          const isIncome = t.expenseMinor === 0;
          return (
            <View key={t.currency} style={[styles.block, index > 0 && styles.divider]}>
              {code}
              <Txt variant="label" tone="inkMuted">{isIncome ? 'Pemasukan' : 'Pengeluaran'} {monthName}</Txt>
              <Money minor={isIncome ? t.incomeMinor : t.expenseMinor} currency={t.currency} variant="display" />
            </View>
          );
        }
        return (
          <View key={t.currency} style={[styles.block, index > 0 && styles.divider]}>
            {code}
            <View style={styles.line}>
              <Txt tone="inkMuted">Pemasukan {monthName}</Txt>
              <Money minor={t.incomeMinor} currency={t.currency} variant="bodyStrong" />
            </View>
            <View style={styles.line}>
              <Txt tone="inkMuted">Pengeluaran {monthName}</Txt>
              <Money minor={t.expenseMinor} currency={t.currency} variant="bodyStrong" />
            </View>
            <View style={[styles.line, styles.totalLine]}>
              <Txt variant="bodyStrong">Selisih</Txt>
              <Money minor={t.incomeMinor - t.expenseMinor} currency={t.currency} variant="heading" tone="signed" sign />
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
