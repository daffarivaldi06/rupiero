// The transaction list as a table on wide web screens (ADR 0001): Date | Description | Category |
// Account | Amount, still grouped by day with the day totals, one row per ledger entry (so both sides
// of a transfer keep their own account and amount).
import React from 'react';
import { Pressable, StyleSheet, View, type PressableStateCallbackType } from 'react-native';

import { LedgerDayHeader } from '../../components/LedgerSection';
import { ledgerTableCells } from '../../components/ledgerText';
import { Money } from '../../components/Money';
import { Txt } from '../../components/Txt';
import { formatDayMonth } from '../../domain/dates';
import { useI18n } from '../../i18n/I18nProvider';
import { useThemedStyles, type Theme } from '../../theme/ThemeProvider';
import type { LedgerTableDayProps, LedgerTableRowProps } from './LedgerTable.types';

/** react-native-web adds `hovered` to Pressable's state. */
type PressState = PressableStateCallbackType & { hovered?: boolean };

export function LedgerTableHead() {
  const styles = useThemedStyles(makeStyles);
  const { t } = useI18n();
  const head = (label: string, style: object, align?: 'right') => (
    <View style={style} role="columnheader">
      <Txt variant="label" tone="inkMuted" style={align === 'right' ? styles.right : undefined}>{label}</Txt>
    </View>
  );
  return (
    <View style={[styles.cells, styles.head]} role="row">
      {head(t('transactions.columns.date'), styles.date)}
      {head(t('transactions.columns.description'), styles.description)}
      {head(t('transactions.columns.category'), styles.category)}
      {head(t('transactions.columns.account'), styles.account)}
      {head(t('transactions.columns.amount'), styles.amount, 'right')}
    </View>
  );
}

export function LedgerTableDay({ date, totals }: LedgerTableDayProps) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.day}>
      <LedgerDayHeader date={date} totals={totals} />
    </View>
  );
}

export function LedgerTableRow({ item, onPress }: LedgerTableRowProps) {
  const styles = useThemedStyles(makeStyles);
  const { locale } = useI18n();
  const { description, detail, category, account } = ledgerTableCells(item);
  return (
    <Pressable onPress={onPress} role="row" style={({ hovered, pressed }: PressState) => [styles.cells, styles.row, (hovered || pressed) && styles.rowHover]}>
      <View style={styles.date} role="cell">
        <Txt tone="inkMuted" numberOfLines={1}>{formatDayMonth(item.date, locale)}</Txt>
      </View>
      <View style={styles.description} role="cell">
        {description ? <Txt numberOfLines={1}>{description}</Txt> : <Txt tone="inkMuted">—</Txt>}
        {detail !== undefined && <Txt variant="caption" tone="inkMuted" numberOfLines={1}>{detail}</Txt>}
      </View>
      <View style={styles.category} role="cell">
        <Txt numberOfLines={1}>{category}</Txt>
      </View>
      <View style={styles.account} role="cell">
        <Txt numberOfLines={1}>{account}</Txt>
      </View>
      <View style={styles.amount} role="cell">
        <Money minor={item.signedMinor} currency={item.currency} size="row" tone="signed" sign style={styles.right} />
      </View>
    </Pressable>
  );
}

const makeStyles = ({ color, space }: Theme) =>
  StyleSheet.create({
    cells: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space.md,
      paddingHorizontal: space.sm,
    },
    head: {
      paddingVertical: space.sm,
      borderBottomWidth: 1,
      borderBottomColor: color.ink,
    },
    row: {
      minHeight: 52,
      paddingVertical: space.xs,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: color.line,
      cursor: 'pointer',
    },
    rowHover: {
      backgroundColor: color.line,
    },
    // Same inset as the rows, so the day's date and totals line up with the Date and Amount columns.
    day: {
      marginTop: space.lg,
      paddingHorizontal: space.sm,
    },
    // Column widths: date and amount fixed, the text columns share the rest.
    date: {
      width: 72,
    },
    description: {
      flex: 3,
      minWidth: 0,
    },
    category: {
      flex: 1.4,
      minWidth: 0,
    },
    account: {
      flex: 1.4,
      minWidth: 0,
    },
    amount: {
      width: 160,
    },
    right: {
      textAlign: 'right',
    },
  });
