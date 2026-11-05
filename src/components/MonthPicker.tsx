import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { addMonths, formatMonthLabel, formatMonthShort, type Month } from '../domain/dates';
import { useThemedStyles, type Theme } from '../theme/ThemeProvider';
import { Txt } from './Txt';
import { useI18n } from '../i18n/I18nProvider';

interface MonthPickerProps {
  month: Month;
  onChangeMonth: (month: Month) => void;
}

/** ‹ Nov 2026 ›, as in the Dashboard header. */
export const MonthPicker: React.FC<MonthPickerProps> = ({ month, onChangeMonth }) => {
  const styles = useThemedStyles(makeStyles);
  const { t, locale } = useI18n();
  return (
    <View style={styles.monthPicker}>
      <Pressable
        onPress={() => onChangeMonth(addMonths(month, -1))}
        style={styles.monthButton}
        hitSlop={{ left: 4, right: 4 }}
        accessibilityRole="button"
        accessibilityLabel={t('common.previousMonth')}
      >
        <Txt variant="title">‹</Txt>
      </Pressable>
      <Txt
        variant="heading"
        style={styles.monthLabel}
        numberOfLines={1}
        adjustsFontSizeToFit
        maxFontSizeMultiplier={1.5}
        accessibilityLabel={formatMonthLabel(month, locale)}
      >
        {formatMonthShort(month, locale)}
      </Txt>
      <Pressable
        onPress={() => onChangeMonth(addMonths(month, 1))}
        style={styles.monthButton}
        hitSlop={{ left: 4, right: 4 }}
        accessibilityRole="button"
        accessibilityLabel={t('common.nextMonth')}
      >
        <Txt variant="title">›</Txt>
      </Pressable>
    </View>
  );
};

const makeStyles = (_theme: Theme) =>
  StyleSheet.create({
    monthPicker: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    monthLabel: {
      minWidth: 72,
      textAlign: 'center',
    },
    // Narrower than the icon buttons so mark, name, month and two icons fit on a ~390 dp screen.
    monthButton: {
      minWidth: 40,
      minHeight: 48,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
