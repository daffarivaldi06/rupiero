import React from 'react';
import { View, StyleSheet } from 'react-native';
import type { CurrencyBalance } from '../domain/types';
import { useThemedStyles, type Theme } from '../theme/ThemeProvider';
import { Money } from './Money';
import type { RollSpec } from './countUp';
import { Txt } from './Txt';
import { useI18n } from '../i18n/I18nProvider';

interface BalanceHeroProps {
  label: string;
  balances: CurrencyBalance[];
  roll?: RollSpec | null;
}

/**
 * One big balance per currency, straight on the page and ruled like a ledger: ink rule on top,
 * hairlines between currencies, a double rule under the total. Currencies are never added up.
 */
export const BalanceHero: React.FC<BalanceHeroProps> = ({ label, balances, roll }) => {
  const styles = useThemedStyles(makeStyles);
  const { t } = useI18n();
  return (
    <View>
      <Txt variant="label" tone="inkMuted" style={styles.label}>{label}</Txt>
      <View style={styles.topRule} />
      {balances.length === 0 && <Txt tone="inkMuted" style={styles.empty}>{t('balance.noAccounts')}</Txt>}
      {balances.map((b, index) => (
        <View key={b.currency} style={[styles.row, index > 0 && styles.divider]}>
          <Txt variant="code" tone={b.currency === 'EUR' ? 'eur' : 'idrText'}>{b.currency}</Txt>
          <Money
            minor={b.balanceMinor}
            currency={b.currency}
            variant="hero"
            tone={b.balanceMinor < 0 ? 'expense' : 'neutral'}
            roll={roll}
          />
        </View>
      ))}
      <View style={styles.doubleRule} />
    </View>
  );
};

const makeStyles = ({ color, space }: Theme) =>
  StyleSheet.create({
    label: {
      marginBottom: space.xs,
    },
    topRule: {
      height: 1,
      backgroundColor: color.ink,
    },
    empty: {
      paddingVertical: space.lg,
    },
    row: {
      paddingTop: space.md,
      paddingBottom: space.sm,
    },
    divider: {
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
