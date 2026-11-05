import React from 'react';
import { View, StyleSheet, Pressable, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Month } from '../domain/dates';
import { Wordmark } from '../brand/Wordmark';
import { useTheme, useThemedStyles, type Theme } from '../theme/ThemeProvider';
import { usePrivacy } from '../privacy/PrivacyProvider';
import { EyeIcon } from './EyeIcon';
import { MonthPicker } from './MonthPicker';
import { SettingsIcon } from './SettingsIcon';
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
  const { t } = useI18n();
  // Below ~380 dp, or with large system fonts, the name would push the icons off screen.
  const { width, fontScale } = useWindowDimensions();
  const compact = width < 380 || fontScale > 1.3;

  return (
    <View style={[styles.bar, { paddingTop: insets.top }]}>
      <Wordmark compact={compact} />
      <View style={styles.spacer} />
      <MonthPicker month={month} onChangeMonth={onChangeMonth} />
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
    iconButton: {
      minWidth: 48,
      minHeight: 48,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
