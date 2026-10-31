import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useThemedStyles, type Theme } from '../theme/ThemeProvider';
import { formatDayHeader, type LocalDate } from '../domain/dates';
import type { DayTotal } from '../domain/ledger';
import { Txt } from './Txt';
import { Money } from './Money';

interface LedgerSectionProps {
  date: LocalDate;
  /** The day's net per currency; omit when a subtotal would only repeat a single row. */
  totals?: DayTotal[];
  children: React.ReactNode;
}

/** One day of the ledger: a dated header (with the day's net per currency if given), then its rows. */
export const LedgerSection: React.FC<LedgerSectionProps> = ({ date, totals = [], children }) => {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <Txt variant="label" tone="inkMuted">{formatDayHeader(date)}</Txt>
        <View style={styles.totals}>
          {totals.map((t) => (
            <Money key={t.currency} minor={t.netMinor} currency={t.currency} variant="caption" tone="signed" sign />
          ))}
        </View>
      </View>
      {children}
    </View>
  );
};

const makeStyles = ({ color, space }: Theme) =>
  StyleSheet.create({
    section: {
      marginBottom: space.lg,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-end',
      paddingBottom: space.xs,
      borderBottomWidth: 1,
      borderBottomColor: color.ink,
    },
    totals: {
      alignItems: 'flex-end',
    },
  });
