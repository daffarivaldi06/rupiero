import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { addMonths, formatMonthLabel, formatMonthShort, type Month } from '../domain/dates';
import { Wordmark } from '../brand/Wordmark';
import { useTheme, useThemedStyles, type Theme } from '../theme/ThemeProvider';
import { SettingsIcon } from './SettingsIcon';
import { Txt } from './Txt';

interface AppHeaderProps {
  month: Month;
  onChangeMonth: (month: Month) => void;
  onPressSettings: () => void;
}

/** Dashboard header: wordmark, month picker and settings, drawn under the status bar. */
export const AppHeader: React.FC<AppHeaderProps> = ({ month, onChangeMonth, onPressSettings }) => {
  const insets = useSafeAreaInsets();
  const { color } = useTheme();
  const styles = useThemedStyles(makeStyles);

  return (
    <View style={[styles.bar, { paddingTop: insets.top }]}>
      <Wordmark />
      <View style={styles.spacer} />
      <View style={styles.monthPicker}>
        <Pressable
          onPress={() => onChangeMonth(addMonths(month, -1))}
          style={styles.iconButton}
          accessibilityRole="button"
          accessibilityLabel="Bulan sebelumnya"
        >
          <Txt variant="title">‹</Txt>
        </Pressable>
        <Txt
          variant="heading"
          style={styles.monthLabel}
          numberOfLines={1}
          adjustsFontSizeToFit
          accessibilityLabel={formatMonthLabel(month)}
        >
          {formatMonthShort(month)}
        </Txt>
        <Pressable
          onPress={() => onChangeMonth(addMonths(month, 1))}
          style={styles.iconButton}
          accessibilityRole="button"
          accessibilityLabel="Bulan berikutnya"
        >
          <Txt variant="title">›</Txt>
        </Pressable>
      </View>
      <Pressable onPress={onPressSettings} style={styles.iconButton} accessibilityRole="button" accessibilityLabel="Pengaturan">
        <SettingsIcon color={color.ink} />
      </Pressable>
    </View>
  );
};

const makeStyles = ({ color, space }: Theme) =>
  StyleSheet.create({
    bar: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingLeft: space.lg,
      paddingRight: space.xs,
      paddingBottom: space.xs,
      backgroundColor: color.bg,
    },
    spacer: {
      flex: 1,
    },
    monthPicker: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    monthLabel: {
      minWidth: 72,
      textAlign: 'center',
    },
    iconButton: {
      minWidth: 44,
      minHeight: 48,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
