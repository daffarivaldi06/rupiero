import React from 'react';
import { Text, type TextProps } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import type { Palette } from '../theme/tokens';
import { textVariants, type TextVariant } from '../theme/typography';

export type TextTone = Extract<
  keyof Palette,
  'ink' | 'inkMuted' | 'eur' | 'idrText' | 'expense' | 'incomeText' | 'onInk' | 'onExpense' | 'onIncome' | 'onIdr'
>;

interface TxtProps extends TextProps {
  variant?: TextVariant;
  tone?: TextTone;
}

/** Text in IBM Plex with a type-scale variant and a semantic colour. */
export const Txt: React.FC<TxtProps> = ({ variant = 'body', tone = 'ink', style, ...props }) => {
  const { color } = useTheme();
  return <Text {...props} style={[textVariants[variant], { color: color[tone] }, style]} />;
};
