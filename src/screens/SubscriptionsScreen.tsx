import React, { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSQLiteContext } from '../db/DatabaseProvider';
import { useFocusEffect, useNavigation } from '@react-navigation/native';

import { listRecurringRules, type RecurringRuleDetail } from '../db/repos/recurring';
import { formatDayMonth, todayLocal } from '../domain/dates';
import { activeSubscriptions, describeFrequency, monthlyEquivalent, nextDueDate, subscriptionTotals } from '../domain/recurrence';
import { Money } from '../components/Money';
import { Txt } from '../components/Txt';
import type { RootNavigation } from '../navigation/types';
import { useThemedStyles, type Theme } from '../theme/ThemeProvider';
import { useI18n } from '../i18n/I18nProvider';
import { renderMessage } from '../i18n/rich';

/** Active recurring expenses with their next due date, and what they cost per month per currency. */
export default function SubscriptionsScreen() {
  const db = useSQLiteContext();
  const navigation = useNavigation<RootNavigation>();
  const styles = useThemedStyles(makeStyles);
  const { t } = useI18n();
  const [rules, setRules] = useState<RecurringRuleDetail[]>([]);

  useFocusEffect(
    useCallback(() => {
      listRecurringRules(db).then(setRules).catch(console.error);
    }, [db]),
  );

  const today = todayLocal();
  const subscriptions = activeSubscriptions(rules, today).sort((a, b) =>
    (nextDueDate(a, today) ?? '').localeCompare(nextDueDate(b, today) ?? ''),
  );
  const totals = subscriptionTotals(rules, today);

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Txt variant="label" tone="inkMuted" style={styles.label}>{t('subscriptions.monthlyTotal')}</Txt>
      <View style={styles.topRule} />
      {totals.length === 0 && <Txt tone="inkMuted" style={styles.empty}>{t('subscriptions.empty')}</Txt>}
      {totals.map((total, index) => (
        <View key={total.currency} style={[styles.totalRow, index > 0 && styles.divider]}>
          <Txt variant="code" tone={total.currency === 'EUR' ? 'eur' : 'idrText'}>{total.currency}</Txt>
          <Money minor={total.monthlyMinor} currency={total.currency} variant="display" />
        </View>
      ))}
      {totals.length > 0 && <View style={styles.doubleRule} />}
      <Txt variant="caption" tone="inkMuted" style={styles.hint}>
        {t('subscriptions.hint')}
      </Txt>

      <View style={styles.list}>
        {subscriptions.map((rule) => {
          const next = nextDueDate(rule, today);
          return (
            <Pressable
              key={rule.id}
              onPress={() => navigation.navigate('RecurringForm', { ruleId: rule.id })}
              style={styles.row}
              accessibilityRole="button"
            >
              <View style={styles.rowText}>
                <Txt numberOfLines={1}>{rule.note || rule.categoryName}</Txt>
                <Txt variant="caption" tone="inkMuted" numberOfLines={1}>
                  {describeFrequency(rule.frequency, rule.interval)}
                  {next ? ` · ${t('recurrence.next', { date: formatDayMonth(next) })}` : ''}
                </Txt>
              </View>
              <View style={styles.amounts}>
                <Money minor={rule.amountMinor} currency={rule.currency} variant="bodyStrong" />
                {rule.frequency !== 'monthly' || rule.interval !== 1 ? (
                  <Txt variant="caption" tone="inkMuted">
                    {renderMessage('subscriptions.perMonth', {
                      amount: <Money minor={monthlyEquivalent(rule)} currency={rule.currency} variant="caption" tone="inkMuted" />,
                    })}
                  </Txt>
                ) : null}
              </View>
            </Pressable>
          );
        })}
        <Pressable onPress={() => navigation.navigate('RecurringForm')} style={styles.row} accessibilityRole="button">
          <Txt variant="bodyStrong">{t('subscriptions.add')}</Txt>
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
    label: {
      marginBottom: space.xs,
    },
    topRule: {
      height: 1,
      backgroundColor: color.ink,
    },
    empty: {
      paddingVertical: space.lg,
    },
    totalRow: {
      paddingTop: space.md,
      paddingBottom: space.sm,
    },
    divider: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: color.line,
    },
    doubleRule: {
      height: 4,
      borderTopWidth: 1,
      borderBottomWidth: 1,
      borderColor: color.ink,
    },
    hint: {
      marginTop: space.sm,
      marginBottom: space.xl,
    },
    list: {
      borderTopWidth: 1,
      borderTopColor: color.ink,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: 56,
      paddingVertical: space.sm,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: color.line,
    },
    rowText: {
      flex: 1,
      marginRight: space.md,
    },
    amounts: {
      alignItems: 'flex-end',
    },
  });
