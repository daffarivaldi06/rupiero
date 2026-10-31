import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useThemedStyles, type Theme } from '../theme/ThemeProvider';
import type { CurrencyCode } from '../domain/money';
import { Txt } from './Txt';
import { Money } from './Money';

interface LedgerRowProps {
  title: string;
  subtitle?: string;
  /** Signed amount: positive in, negative out. */
  signedMinor: number;
  currency: CurrencyCode;
  onPress?: () => void;
}

/** A ruled ledger line: description on the left, signed amount on the right. No card. */
export const LedgerRow: React.FC<LedgerRowProps> = ({ title, subtitle, signedMinor, currency, onPress }) => {
  const styles = useThemedStyles(makeStyles);
  const content = (
    <>
      <View style={styles.text}>
        <Txt numberOfLines={1}>{title}</Txt>
        {subtitle ? (
          <Txt variant="caption" tone="inkMuted" numberOfLines={1}>
            {subtitle}
          </Txt>
        ) : null}
      </View>
      <Money minor={signedMinor} currency={currency} variant="bodyStrong" tone="signed" sign />
    </>
  );

  return onPress ? (
    <Pressable onPress={onPress} style={styles.row} accessibilityRole="button">
      {content}
    </Pressable>
  ) : (
    <View style={styles.row}>{content}</View>
  );
};

const makeStyles = ({ color, space }: Theme) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: 56,
      paddingVertical: space.sm,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: color.line,
    },
    text: {
      flex: 1,
      marginRight: space.md,
    },
  });
