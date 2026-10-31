import React, { useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { addDays, formatDateLabel, fromLocalDate, toLocalDate, todayLocal, type LocalDate } from '../domain/dates';
import { useThemedStyles, type Theme } from '../theme/ThemeProvider';
import { Txt } from './Txt';
import { useI18n } from '../i18n/I18nProvider';

interface DateChipProps {
  value: LocalDate | null;
  onChange: (date: LocalDate) => void;
  /** Shown when value is null. */
  placeholder?: string;
  accessibilityLabel: string;
  minimumDate?: LocalDate;
}

/** "Today", "Yesterday" or "30 Sep 2026"; opens the system date picker. */
export const DateChip: React.FC<DateChipProps> = ({ value, onChange, placeholder, accessibilityLabel, minimumDate }) => {
  const styles = useThemedStyles(makeStyles);
  const { t, locale } = useI18n();
  const [showIos, setShowIos] = useState(false);
  const today = todayLocal();
  const label =
    value === null
      ? placeholder ?? t('common.pickDate')
      : value === today
        ? t('common.today')
        : value === addDays(today, -1)
          ? t('common.yesterday')
          : formatDateLabel(value, locale);
  const initial = fromLocalDate(value ?? (minimumDate && minimumDate > today ? minimumDate : today));

  const open = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: initial,
        mode: 'date',
        minimumDate: minimumDate ? fromLocalDate(minimumDate) : undefined,
        onChange: (event, picked) => {
          if (event.type === 'set' && picked) onChange(toLocalDate(picked));
        },
      });
    } else {
      setShowIos((shown) => !shown);
    }
  };

  return (
    <View>
      <Pressable onPress={open} style={styles.chip} accessibilityRole="button" accessibilityLabel={t('common.labelValue', { label: accessibilityLabel, value: label })}>
        <Txt variant="label" tone={value === null ? 'inkMuted' : 'ink'}>{label}</Txt>
      </Pressable>
      {showIos && (
        <DateTimePicker
          value={initial}
          mode="date"
          display="inline"
          minimumDate={minimumDate ? fromLocalDate(minimumDate) : undefined}
          onChange={(_, picked) => picked && onChange(toLocalDate(picked))}
        />
      )}
    </View>
  );
};

const makeStyles = ({ color, radius, space }: Theme) =>
  StyleSheet.create({
    chip: {
      minHeight: 48,
      alignSelf: 'flex-start',
      justifyContent: 'center',
      paddingHorizontal: space.md,
      borderRadius: radius.sm,
      borderWidth: 1,
      borderColor: color.lineStrong,
    },
  });
