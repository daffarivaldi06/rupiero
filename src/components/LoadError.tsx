import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useI18n } from '../i18n/I18nProvider';
import { useThemedStyles, type Theme } from '../theme/ThemeProvider';
import { Button } from './Button';
import { Txt } from './Txt';

/** Inline "could not load" with a retry, in place of a screen's content. */
export function LoadError({ onRetry }: { onRetry: () => void }) {
  const styles = useThemedStyles(makeStyles);
  const { t } = useI18n();
  return (
    <View style={styles.box} accessibilityLiveRegion="polite">
      <Txt tone="expense">{t('loadError.message')}</Txt>
      <Button title={t('common.retry')} variant="outline" onPress={onRetry} style={styles.button} />
    </View>
  );
}

const makeStyles = ({ space }: Theme) =>
  StyleSheet.create({
    box: {
      paddingVertical: space.lg,
    },
    button: {
      alignSelf: 'flex-start',
    },
  });
