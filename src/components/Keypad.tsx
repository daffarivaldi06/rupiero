import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import type { KeypadKey } from '../domain/calc';
import { CURRENCIES, type CurrencyCode } from '../domain/money';
import { useThemedStyles, type Theme } from '../theme/ThemeProvider';
import { Txt } from './Txt';

interface KeypadProps {
  currency: CurrencyCode;
  onKey: (key: KeypadKey) => void;
  /** Long-press on backspace. */
  onClear: () => void;
}

const LABELS: Partial<Record<KeypadKey, string>> = { back: '⌫' };
const A11Y: Partial<Record<KeypadKey, string>> = {
  back: 'Hapus satu',
  '+': 'tambah',
  '−': 'kurang',
  '×': 'kali',
  '÷': 'bagi',
  ',': 'koma',
  '000': 'tiga nol',
};

/** Digits and + − × ÷ for the quick-add calculator. EUR gets a decimal comma, IDR gets "000" instead. */
export const Keypad: React.FC<KeypadProps> = ({ currency, onKey, onClear }) => {
  const styles = useThemedStyles(makeStyles);
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
                accessibilityLabel={A11Y[key] ?? key}
              >
                <Txt variant="title" tone={isOperator ? 'inkMuted' : 'ink'}>{LABELS[key] ?? key}</Txt>
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
      height: 54,
      alignItems: 'center',
      justifyContent: 'center',
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: color.line,
    },
    pressed: {
      backgroundColor: color.line,
    },
  });
