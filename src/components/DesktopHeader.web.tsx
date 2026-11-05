import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePrivacy } from '../privacy/PrivacyProvider';
import { useI18n } from '../i18n/I18nProvider';
import { useTheme, useThemedStyles, type Theme } from '../theme/ThemeProvider';
import { Button } from './Button';
import { EyeIcon } from './EyeIcon';
import { MonthPicker } from './MonthPicker';
import { Txt } from './Txt';
import type { DesktopHeaderProps } from './DesktopHeader.types';

/**
 * Header on wide web screens (ADR 0001): optional title and month picker on the left, the
 * hide-balances toggle and "+ Add transaction" on the right. The sidebar has the wordmark and
 * Settings, so they are not repeated here. Aligned with the screen's content column.
 */
export function DesktopHeader({ title, month, onChangeMonth, onAdd }: DesktopHeaderProps) {
  const insets = useSafeAreaInsets();
  const { color, layout } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { hidden, toggleHidden } = usePrivacy();
  const { t } = useI18n();

  return (
    <View style={[styles.bar, { paddingTop: insets.top + 8 }]}>
      <View style={[styles.inner, { maxWidth: layout.contentMaxWidth }]}>
        {title !== undefined && <Txt variant="title" style={styles.title} numberOfLines={1}>{title}</Txt>}
        {month !== undefined && onChangeMonth && <MonthPicker month={month} onChangeMonth={onChangeMonth} />}
        <View style={styles.spacer} />
        <Pressable
          onPress={toggleHidden}
          style={styles.iconButton}
          accessibilityRole="switch"
          accessibilityState={{ checked: hidden }}
          accessibilityLabel={t('header.hideBalances')}
        >
          <EyeIcon closed={hidden} color={color.ink} />
        </Pressable>
        <Button title={t('header.addTransaction')} onPress={onAdd} style={styles.add} />
      </View>
    </View>
  );
}

const makeStyles = ({ color, space }: Theme) =>
  StyleSheet.create({
    bar: {
      paddingBottom: space.sm,
      backgroundColor: color.bg,
    },
    inner: {
      width: '100%',
      alignSelf: 'center',
      flexDirection: 'row',
      alignItems: 'center',
      gap: space.sm,
      paddingHorizontal: space.xl,
    },
    title: {
      marginRight: space.md,
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
    add: {
      marginVertical: 0,
    },
  });
