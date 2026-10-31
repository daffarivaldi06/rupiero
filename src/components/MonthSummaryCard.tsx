import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useThemedStyles, type Theme } from '../theme/ThemeProvider';
import type { CurrencyTotals } from '../domain/types';
import { Card } from './Card';
import { Money } from './Money';
import { Txt } from './Txt';

interface MonthSummaryCardProps {
  title: string;
  totals: CurrencyTotals[];
}

/** Net, income and expense for a period, one block per currency (currencies are never added up). */
export const MonthSummaryCard: React.FC<MonthSummaryCardProps> = ({ title, totals }) => {
  const styles = useThemedStyles(makeStyles);
  return (
    <Card>
      <Txt variant="label" tone="inkMuted">{title}</Txt>
      {totals.length === 0 && <Txt tone="inkMuted">Belum ada akun</Txt>}
      {totals.map((t, index) => (
        <View key={t.currency} style={[styles.block, index > 0 && styles.blockDivider]}>
          <Txt variant="code" tone={t.currency === 'EUR' ? 'eur' : 'idrText'}>{t.currency}</Txt>
          <Money minor={t.incomeMinor - t.expenseMinor} currency={t.currency} variant="display" />
          <View style={styles.row}>
            <View style={styles.item}>
              <Txt variant="caption" tone="inkMuted">Pemasukan</Txt>
              <Money minor={t.incomeMinor} currency={t.currency} variant="label" tone="incomeText" sign />
            </View>
            <View style={styles.item}>
              <Txt variant="caption" tone="inkMuted">Pengeluaran</Txt>
              <Money minor={-t.expenseMinor} currency={t.currency} variant="label" tone="expense" />
            </View>
          </View>
        </View>
      ))}
    </Card>
  );
};

const makeStyles = ({ color, space }: Theme) =>
  StyleSheet.create({
    block: {
      marginTop: space.md,
    },
    blockDivider: {
      marginTop: space.lg,
      paddingTop: space.lg,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: color.line,
    },
    row: {
      flexDirection: 'row',
      marginTop: space.sm,
    },
    item: {
      flex: 1,
    },
  });
