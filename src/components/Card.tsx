import React from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { useThemedStyles, type Theme } from '../theme/ThemeProvider';

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

/** Reserved for the one or two key elements of a screen (e.g. balances). Lists use ledger rows. */
export const Card: React.FC<CardProps> = ({ children, style }) => {
  const styles = useThemedStyles(makeStyles);
  return <View style={[styles.card, style]}>{children}</View>;
};

const makeStyles = ({ color, radius, space }: Theme) =>
  StyleSheet.create({
    card: {
      backgroundColor: color.surface,
      borderRadius: radius.md,
      padding: space.lg,
      marginVertical: space.sm,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: color.line,
    },
  });
