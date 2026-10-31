import React from 'react';
import { TouchableOpacity, StyleSheet, ActivityIndicator, StyleProp, ViewStyle, TextStyle } from 'react-native';
import { useTheme, useThemedStyles, type Theme } from '../theme/ThemeProvider';
import { Txt, type TextTone } from './Txt';

type ButtonVariant = 'primary' | 'income' | 'danger' | 'outline';

interface ButtonProps {
  title: string;
  onPress: () => void;
  loading?: boolean;
  variant?: ButtonVariant;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

const TEXT_TONE: Record<ButtonVariant, TextTone> = {
  primary: 'onInk',
  income: 'onIncome',
  danger: 'onExpense',
  outline: 'ink',
};

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  loading = false,
  variant = 'primary',
  style,
  textStyle,
}) => {
  const { color } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const tone = TEXT_TONE[variant];

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      style={[styles.container, styles[variant], style]}
      onPress={onPress}
      disabled={loading}
      accessibilityRole="button"
      accessibilityState={{ busy: loading }}
    >
      {loading ? (
        <ActivityIndicator color={color[tone]} />
      ) : (
        <Txt variant="bodyStrong" tone={tone} style={textStyle}>{title}</Txt>
      )}
    </TouchableOpacity>
  );
};

const makeStyles = ({ color, radius, space }: Theme) =>
  StyleSheet.create({
    container: {
      minHeight: 48,
      borderRadius: radius.sm,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: space.lg,
      marginVertical: space.sm,
    },
    primary: {
      backgroundColor: color.ink,
    },
    income: {
      backgroundColor: color.income,
    },
    danger: {
      backgroundColor: color.expense,
    },
    outline: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: color.lineStrong,
    },
  });
