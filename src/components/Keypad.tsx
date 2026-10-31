import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import type { KeypadKey } from '../domain/calc';
import { CURRENCIES, SEPARATORS, type CurrencyCode } from '../domain/money';
import { useThemedStyles, type Theme } from '../theme/ThemeProvider';
import { Txt } from './Txt';
import { useI18n } from '../i18n/I18nProvider';
import type { MessageKey } from '../i18n';

interface KeypadProps {
  currency: CurrencyCode;
  onKey: (key: KeypadKey) => void;
  /** Long-press on backspace. */
  onClear: () => void;
}

const A11Y: Partial<Record<KeypadKey, MessageKey>> = {
  back: 'keypad.back',
  '+': 'keypad.plus',
  '−': 'keypad.minus',
  '×': 'keypad.times',
  '÷': 'keypad.divide',
  ',': 'keypad.decimal',
  '000': 'keypad.thousand',
};

/**
 * Digits and + − × ÷ for the quick-add calculator. EUR gets a decimal key (shown as the language's
 * separator, always ',' in the expression), IDR gets "000" instead.
 */
export const Keypad: React.FC<KeypadProps> = ({ currency, onKey, onClear }) => {
  const styles = useThemedStyles(makeStyles);
  const { t, locale } = useI18n();
  const label = (key: KeypadKey) => (key === 'back' ? '⌫' : key === ',' ? SEPARATORS[locale].decimal : key);
  const special: KeypadKey = CURRENCIES[currency].minorDigits > 0 ? ',' : '000';
  const rows: KeypadKey[][] = [
    ['7', '8', '9', '÷'],
    ['4', '5', '6', '×'],
    ['1', '2', '3', '−'],
    [special, '0', 'back', '+'],
  ];

  const press = (key: KeypadKey) => {
    Haptics.selectionAsync().catch(() => {});
    onKey(key);
  };

  return (
    <View style={styles.grid}>
      {rows.map((row, r) => (
        <View key={r} style={styles.row}>
          {row.map((key) => {
            const isOperator = key === '+' || key === '−' || key === '×' || key === '÷';
            return (
              <Pressable
                key={key}
                onPress={() => press(key)}
                onLongPress={key === 'back' ? onClear : undefined}
                style={({ pressed }) => [styles.key, pressed && styles.pressed]}
                accessibilityRole="button"
                accessibilityLabel={A11Y[key] ? t(A11Y[key]) : key}
                accessibilityHint={key === 'back' ? t('keypad.clearHint') : undefined}
              >
                <Txt variant="title" tone={isOperator ? 'inkMuted' : 'ink'}>{label(key)}</Txt>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
};

const makeStyles = ({ color }: Theme) =>
  StyleSheet.create({
    grid: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: color.line,
    },
    row: {
      flexDirection: 'row',
    },
    key: {
      flex: 1,
      minHeight: 54,
      alignItems: 'center',
      justifyContent: 'center',
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: color.line,
    },
    pressed: {
      backgroundColor: color.line,
    },
  });
