import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Card } from './Card';
import { colors } from '../theme/colors';
import { formatMoney } from '../domain/money';
import type { CurrencyTotals } from '../domain/types';

interface MonthSummaryCardProps {
  title: string;
  totals: CurrencyTotals[];
}

/** Net, income and expense for a period, one block per currency (currencies are never added up). */
export const MonthSummaryCard: React.FC<MonthSummaryCardProps> = ({ title, totals }) => (
  <Card style={styles.card}>
    <Text style={styles.title}>{title}</Text>
    {totals.length === 0 && <Text style={styles.empty}>Belum ada akun</Text>}
    {totals.map((t, index) => (
      <View key={t.currency} style={[styles.block, index > 0 && styles.blockDivider]}>
        <Text style={styles.net}>{formatMoney(t.incomeMinor - t.expenseMinor, t.currency)}</Text>
        <View style={styles.row}>
          <View style={styles.item}>
            <Text style={styles.label}>Pemasukan</Text>
            <Text style={[styles.value, { color: colors.primary }]}>
              {formatMoney(t.incomeMinor, t.currency, { sign: true })}
            </Text>
          </View>
          <View style={styles.item}>
            <Text style={styles.label}>Pengeluaran</Text>
            <Text style={[styles.value, { color: colors.danger }]}>{formatMoney(-t.expenseMinor, t.currency)}</Text>
          </View>
        </View>
      </View>
    ))}
  </Card>
);

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    paddingVertical: 24,
    borderColor: colors.border,
  },
  title: {
    color: colors.textSecondary,
    fontSize: 14,
    marginBottom: 8,
  },
  empty: {
    color: colors.textSecondary,
  },
  block: {
    alignItems: 'center',
    width: '100%',
  },
  blockDivider: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  net: {
    color: colors.text,
    fontSize: 30,
    fontWeight: 'bold',
  },
  row: {
    flexDirection: 'row',
    width: '100%',
    marginTop: 12,
  },
  item: {
    alignItems: 'center',
    flex: 1,
  },
  label: {
    color: colors.textSecondary,
    fontSize: 11,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  value: {
    fontSize: 13,
    fontWeight: '700',
  },
});
