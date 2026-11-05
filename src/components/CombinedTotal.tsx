import React from 'react';
import { View, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { formatDayMonth } from '../domain/dates';
import { combinedTotal, type ReferenceRate } from '../domain/fx';
import type { CurrencyCode } from '../domain/money';
import type { CurrencyBalance } from '../domain/types';
import { useI18n } from '../i18n/I18nProvider';
import { useThemedStyles, type Theme } from '../theme/ThemeProvider';
import type { MoneySize, TextVariant } from '../theme/typography';
import { Money } from './Money';
import { Txt } from './Txt';

interface CombinedTotalProps {
  balances: CurrencyBalance[];
  /** The currency everything is converted into. */
  base: CurrencyCode;
  /** The stored ECB rate, or null if none has been fetched yet. */
  rate: ReferenceRate | null;
  /** Text variant of the figure. */
  variant?: TextVariant;
  /** An amount size for wide layouts (e.g. a KPI card). Takes the place of `variant` when set. */
  size?: MoneySize;
  style?: StyleProp<ViewStyle>;
}

/**
 * All balances converted into `base` at the ECB reference rate and added up, with the rate's date.
 * Without a rate it says so instead of disappearing.
 */
export const CombinedTotal: React.FC<CombinedTotalProps> = ({ balances, base, rate, variant = 'display', size, style }) => {
  const styles = useThemedStyles(makeStyles);
  const { t, locale } = useI18n();
  const total = rate ? combinedTotal(balances, base, rate.rateMicro) : null;
  // Too large to convert safely: nothing sensible to show.
  if (rate && total === null) return null;

  return (
    <View style={style}>
      <Txt variant="label" tone="inkMuted">{t('dashboard.totalIn', { currency: base })}</Txt>
      {rate && total !== null ? (
        <>
          <Money minor={total} currency={base} variant={variant} size={size} tone={total < 0 ? 'expense' : 'neutral'} />
          <Txt variant="caption" tone="inkMuted">{t('dashboard.totalRate', { date: formatDayMonth(rate.date, locale) })}</Txt>
        </>
      ) : (
        <Txt tone="inkMuted" style={styles.noRate}>{t('dashboard.noRate')}</Txt>
      )}
    </View>
  );
};

const makeStyles = ({ space }: Theme) =>
  StyleSheet.create({
    noRate: {
      marginTop: space.xs,
    },
  });
