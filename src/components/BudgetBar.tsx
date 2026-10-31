import React from 'react';
import { StyleSheet, View } from 'react-native';
import type { BudgetStatus } from '../domain/budget';
import type { CurrencyCode } from '../domain/money';
import { useThemedStyles, type Theme } from '../theme/ThemeProvider';
import { Money } from './Money';
import { Txt } from './Txt';

interface BudgetBarProps {
  status: BudgetStatus;
  currency: CurrencyCode;
}

const LEVEL_TEXT = { ok: '', warning: 'Hampir habis', over: 'Melewati budget' } as const;

/**
 * Spent against limit for one currency: amounts, a thin bar and what is left. Level is spelled out
 * in words as well, so colour is never the only signal.
 */
export const BudgetBar: React.FC<BudgetBarProps> = ({ status, currency }) => {
  const styles = useThemedStyles(makeStyles);
  const fill = status.level === 'over' ? styles.over : status.level === 'warning' ? styles.warning : styles.ok;
  const levelText = LEVEL_TEXT[status.level];

  return (
    <View style={styles.wrap}>
      <View style={styles.line}>
        <Txt variant="label" style={styles.amounts} numberOfLines={1}>
          <Money minor={status.spentMinor} currency={currency} variant="label" /> dari{' '}
          <Money minor={status.limitMinor} currency={currency} variant="label" tone="inkMuted" />
        </Txt>
        <Txt variant="label" tone={status.level === 'over' ? 'expense' : status.level === 'warning' ? 'idrText' : 'inkMuted'}>
          {status.percent}%
        </Txt>
      </View>
      <View
        style={styles.track}
        accessible
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 0, max: 100, now: Math.min(status.percent, 100) }}
      >
        <View style={[styles.fill, fill, { width: `${Math.min(status.percent, 100)}%` }]} />
      </View>
      <View style={styles.line}>
        <Txt variant="caption" tone="inkMuted">
          {status.remainingMinor >= 0 ? 'Sisa ' : 'Lebih '}
          <Money minor={Math.abs(status.remainingMinor)} currency={currency} variant="caption" tone="inkMuted" />
        </Txt>
        {levelText !== '' && (
          <Txt variant="caption" tone={status.level === 'over' ? 'expense' : 'idrText'}>{levelText}</Txt>
        )}
      </View>
    </View>
  );
};

const makeStyles = ({ color, space }: Theme) =>
  StyleSheet.create({
    wrap: {
      gap: space.xs,
      paddingVertical: space.xs,
    },
    line: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: space.sm,
    },
    amounts: {
      flex: 1,
    },
    track: {
      height: 6,
      borderRadius: 3,
      backgroundColor: color.line,
      overflow: 'hidden',
    },
    fill: {
      height: '100%',
      borderRadius: 3,
    },
    ok: {
      backgroundColor: color.ink,
    },
    warning: {
      backgroundColor: color.idrText,
    },
    over: {
      backgroundColor: color.expense,
    },
  });
