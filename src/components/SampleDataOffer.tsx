import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useI18n } from '../i18n/I18nProvider';
import { useThemedStyles, type Theme } from '../theme/ThemeProvider';
import { Button } from './Button';
import { Card } from './Card';
import { Txt } from './Txt';

interface SampleDataOfferProps {
  onLoad: () => void;
  onDismiss: () => void;
  style?: StyleProp<ViewStyle>;
}

/** First launch on the web: try the app with sample data, or start empty. */
export const SampleDataOffer: React.FC<SampleDataOfferProps> = ({ onLoad, onDismiss, style }) => {
  const styles = useThemedStyles(makeStyles);
  const { t } = useI18n();
  return (
    <Card style={style}>
      <Txt variant="heading">{t('sampleOffer.title')}</Txt>
      <Txt tone="inkMuted" style={styles.body}>{t('sampleOffer.body')}</Txt>
      <View style={styles.actions}>
        <Button title={t('sampleOffer.load')} onPress={onLoad} style={styles.action} />
        <Button title={t('sampleOffer.dismiss')} variant="outline" onPress={onDismiss} style={styles.action} />
      </View>
    </Card>
  );
};

const makeStyles = ({ space }: Theme) =>
  StyleSheet.create({
    body: {
      marginTop: space.xs,
    },
    actions: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      columnGap: space.md,
      marginTop: space.sm,
    },
    action: {
      flexGrow: 1,
    },
  });
