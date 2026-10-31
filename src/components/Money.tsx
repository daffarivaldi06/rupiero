import React from 'react';
import { Text, type StyleProp, type TextStyle } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { textVariants, type TextVariant } from '../theme/typography';
import { formatMoneyParts, type CurrencyCode } from '../domain/money';
import type { TextTone } from './Txt';

/**
 * neutral: ink. signed: income/expense colour by sign. currency: EUR indigo / IDR turmeric.
 * Or any text tone directly.
 */
export type MoneyTone = 'neutral' | 'signed' | 'currency' | TextTone;

interface MoneyProps {
  minor: number;
  currency: CurrencyCode;
  variant?: TextVariant;
  tone?: MoneyTone;
  /** Prefix positive amounts with "+". */
  sign?: boolean;
  /** Append the ISO code in Plex Mono, e.g. "€ 12,50 EUR". */
  showCode?: boolean;
  style?: StyleProp<TextStyle>;
}

const NBSP = ' ';

// IBM Plex Sans digits are already equal width (it has no separate tnum feature); tabular-nums
// keeps columns aligned if the font is ever swapped.
const TABULAR: TextStyle = { fontVariant: ['tabular-nums'] };

export const Money: React.FC<MoneyProps> = ({
  minor,
  currency,
  variant = 'body',
  tone = 'neutral',
  sign = false,
  showCode = false,
  style,
}) => {
  const { color } = useTheme();
  const { sign: signChar, symbol, amount } = formatMoneyParts(minor, currency, { sign });

  const textColor =
    tone === 'neutral'
      ? color.ink
      : tone === 'signed'
        ? minor > 0
          ? color.incomeText
          : minor < 0
            ? color.expense
            : color.inkMuted
        : tone === 'currency'
          ? currency === 'EUR'
            ? color.eur
            : color.idrText
          : color[tone];

  return (
    <Text
      style={[textVariants[variant], TABULAR, { color: textColor }, style]}
      numberOfLines={1}
      adjustsFontSizeToFit={variant === 'display' || variant === 'title'}
    >
      {signChar}
      {symbol}
      {NBSP}
      {amount}
      {showCode && (
        <Text style={[textVariants.code, { color: color.inkMuted }]}>
          {NBSP}
          {NBSP}
          {currency}
        </Text>
      )}
    </Text>
  );
};
