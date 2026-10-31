import React from 'react';
import { View, StyleSheet } from 'react-native';
import type { CurrencyTotals } from '../domain/types';
import { useThemedStyles, type Theme } from '../theme/ThemeProvider';
import { Money } from './Money';
import { Txt } from './Txt';
import { useI18n } from '../i18n/I18nProvider';

interface MonthFlowProps {
  title: string;
  totals: CurrencyTotals[];
}

/** Income and expense per currency for a month, as a small ruled table. */
export const MonthFlow: React.FC<MonthFlowProps> = ({ title, totals }) => {
  const styles = useThemedStyles(makeStyles);
  const { t } = useI18n();
  return (
    <View>
      <Txt variant="label" tone="inkMuted" style={styles.title}>{title}</Txt>
      <View style={[styles.row, styles.headerRow]}>
        <View style={styles.codeCell} />
        <Txt variant="caption" tone="inkMuted" style={styles.amountCell}>{t('common.income')}</Txt>
        <Txt variant="caption" tone="inkMuted" style={styles.amountCell}>{t('common.expense')}</Txt>
      </View>
      {totals.map((t) => (
        <View key={t.currency} style={styles.row}>
          <Txt variant="code" tone={t.currency === 'EUR' ? 'eur' : 'idrText'} style={styles.codeCell}>{t.currency}</Txt>
          <Money minor={t.incomeMinor} currency={t.currency} variant="label" tone="incomeText" sign style={styles.amountCell} />
          <Money minor={-t.expenseMinor} currency={t.currency} variant="label" tone="expense" style={styles.amountCell} />
        </View>
      ))}
    </View>
  );
};

const makeStyles = ({ color, space }: Theme) =>
  StyleSheet.create({
    title: {
      marginBottom: space.xs,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: 32,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: color.line,
    },
    headerRow: {
      minHeight: 24,
    },
    codeCell: {
      minWidth: 44,
      flexShrink: 0,
    },
    amountCell: {
      flex: 1,
      textAlign: 'right',
    },
  });
