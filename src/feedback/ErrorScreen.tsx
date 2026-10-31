import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '../components/Button';
import { Txt } from '../components/Txt';
import { RupieroMark } from '../brand/RupieroMark';
import { t } from '../i18n';
import { useThemedStyles, type Theme } from '../theme/ThemeProvider';
import { useReadableInset } from '../theme/layout';

interface ErrorScreenProps {
  title: string;
  message: string;
  /** Technical detail, small, for a bug report. */
  detail?: string;
  onRetry: () => void;
}

/** Full-screen failure state with a way out. Uses the plain t(): it may render outside I18nProvider. */
export function ErrorScreen({ title, message, detail, onRetry }: ErrorScreenProps) {
  const styles = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const inset = useReadableInset(24);
  return (
    <View style={[styles.screen, { paddingTop: insets.top + 48, paddingHorizontal: inset }]}>
      <RupieroMark size={48} />
      <Txt variant="title" style={styles.title} accessibilityRole="header">
        {title}
      </Txt>
      <Txt tone="inkMuted">{message}</Txt>
      {detail ? (
        <Txt variant="caption" tone="inkMuted" style={styles.detail} selectable>
          {t('startup.detail', { message: detail })}
        </Txt>
      ) : null}
      <Button title={t('common.retry')} onPress={onRetry} style={styles.button} />
    </View>
  );
}

const makeStyles = ({ color, space }: Theme) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: color.bg,
      gap: space.sm,
    },
    title: {
      marginTop: space.lg,
    },
    detail: {
      marginTop: space.sm,
    },
    button: {
      marginTop: space.lg,
      alignSelf: 'flex-start',
    },
  });
