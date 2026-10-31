import React from 'react';
import { View, StyleSheet, Pressable, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { addMonths, formatMonthLabel, formatMonthShort, type Month } from '../domain/dates';
import { Wordmark } from '../brand/Wordmark';
import { useTheme, useThemedStyles, type Theme } from '../theme/ThemeProvider';
import { usePrivacy } from '../privacy/PrivacyProvider';
import { EyeIcon } from './EyeIcon';
import { SettingsIcon } from './SettingsIcon';
import { Txt } from './Txt';
import { useI18n } from '../i18n/I18nProvider';

interface AppHeaderProps {
  month: Month;
  onChangeMonth: (month: Month) => void;
  onPressSettings: () => void;
}

/** Dashboard header: wordmark, month picker, hide-balances toggle and settings, drawn under the status bar. */
export const AppHeader: React.FC<AppHeaderProps> = ({ month, onChangeMonth, onPressSettings }) => {
  const insets = useSafeAreaInsets();
  const { color } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { hidden, toggleHidden } = usePrivacy();
  const { t, locale } = useI18n();
  // Below ~380 dp the name would push the icons off screen.
  const compact = useWindowDimensions().width < 380;

  return (
    <View style={[styles.bar, { paddingTop: insets.top }]}>
      <Wordmark compact={compact} />
      <View style={styles.spacer} />
      <View style={styles.monthPicker}>
        <Pressable
          onPress={() => onChangeMonth(addMonths(month, -1))}
          style={styles.monthButton}
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
          accessibilityLabel={formatMonthLabel(month, locale)}
        >
          {formatMonthShort(month, locale)}
        </Txt>
        <Pressable
          onPress={() => onChangeMonth(addMonths(month, 1))}
          style={styles.monthButton}
          accessibilityRole="button"
          accessibilityLabel={t('common.nextMonth')}
        >
          <Txt variant="title">›</Txt>
        </Pressable>
      </View>
      <Pressable
        onPress={toggleHidden}
        style={styles.iconButton}
        accessibilityRole="switch"
        accessibilityState={{ checked: hidden }}
        accessibilityLabel={t('header.hideBalances')}
      >
        <EyeIcon closed={hidden} color={color.ink} />
      </Pressable>
      <Pressable onPress={onPressSettings} style={styles.iconButton} accessibilityRole="button" accessibilityLabel={t('header.settings')}>
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
    // Narrower than the icon buttons so mark, name, month and two icons fit on a ~390 dp screen.
    monthButton: {
      minWidth: 40,
      minHeight: 48,
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconButton: {
      minWidth: 44,
      minHeight: 48,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
