import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Txt } from '../components/Txt';
import { fontFamily } from '../theme/typography';
import { RupieroMark } from './RupieroMark';

export const APP_NAME = 'Rupiero';

/** Mark + name, for the dashboard header. `compact` drops the name where space is tight. */
export const Wordmark: React.FC<{ compact?: boolean }> = ({ compact = false }) => (
  <View style={styles.row} accessible accessibilityRole="header" accessibilityLabel={APP_NAME}>
    <RupieroMark size={30} />
    {!compact && <Txt style={styles.name}>{APP_NAME}</Txt>}
  </View>
);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  name: {
    fontFamily: fontFamily.bold,
    fontSize: 21,
    lineHeight: 26,
    letterSpacing: -0.2,
  },
});
