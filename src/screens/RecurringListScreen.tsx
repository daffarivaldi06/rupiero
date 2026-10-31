import React, { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useFocusEffect, useNavigation } from '@react-navigation/native';

import { listRecurringRules, type RecurringRuleDetail } from '../db/repos/recurring';
import { todayLocal } from '../domain/dates';
import { describeSchedule } from '../domain/recurrence';
import { LedgerRow } from '../components/LedgerRow';
import { Txt } from '../components/Txt';
import type { RootNavigation } from '../navigation/types';
import { useThemedStyles, type Theme } from '../theme/ThemeProvider';

export default function RecurringListScreen() {
  const db = useSQLiteContext();
  const navigation = useNavigation<RootNavigation>();
  const styles = useThemedStyles(makeStyles);
  const [rules, setRules] = useState<RecurringRuleDetail[]>([]);

  useFocusEffect(
    useCallback(() => {
      listRecurringRules(db).then(setRules).catch(console.error);
    }, [db]),
  );

  const today = todayLocal();
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Txt tone="inkMuted" style={styles.description}>
        Transaksi berulang dicatat otomatis saat jatuh tempo (tidak pernah sebelum harinya).
      </Txt>
      <View style={styles.list}>
        {rules.map((rule) => (
          <LedgerRow
            key={rule.id}
            title={rule.note || rule.categoryName}
            subtitle={`${describeSchedule(rule, today)} · ${rule.accountName}`}
            signedMinor={rule.type === 'income' ? rule.amountMinor : -rule.amountMinor}
            currency={rule.currency}
            onPress={() => navigation.navigate('RecurringForm', { ruleId: rule.id })}
          />
        ))}
        <Pressable onPress={() => navigation.navigate('RecurringForm')} style={styles.row} accessibilityRole="button">
          <Txt variant="bodyStrong">+ Tambah transaksi berulang</Txt>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const makeStyles = ({ color, space }: Theme) =>
  StyleSheet.create({
    content: {
      padding: space.lg,
      paddingBottom: space.xxl,
    },
    description: {
      marginBottom: space.lg,
    },
    list: {
      borderTopWidth: 1,
      borderTopColor: color.ink,
    },
    row: {
      minHeight: 52,
      justifyContent: 'center',
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: color.line,
    },
  });
