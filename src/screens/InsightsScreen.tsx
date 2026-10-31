import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSQLiteContext } from '../db/DatabaseProvider';
import { useFocusEffect, useRoute, type RouteProp } from '@react-navigation/native';

import { getCategoryBreakdown, getMonthlyTrend, type CategorySpending, type MonthSpending } from '../db/repos/reports';
import { topShares } from '../domain/chart';
import { addMonths, currentMonth, formatMonthLabel, type Month } from '../domain/dates';
import { CURRENCY_CODES, type CurrencyCode } from '../domain/money';
import { DonutChart } from '../components/DonutChart';
import { Money } from '../components/Money';
import { TrendBars } from '../components/TrendBars';
import { Txt } from '../components/Txt';
import { useDataRevision } from '../data/DataProvider';
import type { RootStackParamList } from '../navigation/types';
import { useTheme, useThemedStyles, type Theme } from '../theme/ThemeProvider';
import { useReadableInset } from '../theme/layout';
import { space } from '../theme/tokens';
import { useI18n } from '../i18n/I18nProvider';

// Shades of the currency colour, largest share first; neighbours are also split by a gap.
const OPACITIES = [1, 0.75, 0.55, 0.4, 0.28, 0.18];
const TOP = OPACITIES.length - 1;

export default function InsightsScreen() {
  const db = useSQLiteContext();
  const route = useRoute<RouteProp<RootStackParamList, 'Insights'>>();
  const { color } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const inset = useReadableInset(space.lg);
  const { t } = useI18n();
  const { revision } = useDataRevision();

  const [month, setMonth] = useState<Month>(route.params?.month ?? currentMonth());
  const [breakdown, setBreakdown] = useState<CategorySpending[]>([]);
  const [trend, setTrend] = useState<MonthSpending[]>([]);
  const [trendEnd, setTrendEnd] = useState<Month>(month);

  const load = useCallback(async () => {
    try {
      const [nextBreakdown, nextTrend] = await Promise.all([getCategoryBreakdown(db, month), getMonthlyTrend(db, trendEnd)]);
      setBreakdown(nextBreakdown);
      setTrend(nextTrend);
    } catch (e) {
      console.error(e);
    }
  }, [db, month, trendEnd]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );
  useEffect(() => {
    if (revision > 0) load();
  }, [revision, load]);

  const changeMonth = (next: Month) => {
    setMonth(next);
    // Keep the selected month inside the six bars.
    if (next > trendEnd || next <= addMonths(trendEnd, -6)) setTrendEnd(next);
  };

  // idrText rather than idr: a graphic on bg needs ≥ 3:1 too.
  const hue = (currency: CurrencyCode) => (currency === 'EUR' ? color.eur : color.idrText);
  const currencies = CURRENCY_CODES.filter((c) => trend.some((point) => point.currency === c)).sort();

  return (
    <ScrollView contentContainerStyle={[styles.content, { paddingHorizontal: inset }]}>
      <View style={styles.monthRow}>
        <Pressable onPress={() => changeMonth(addMonths(month, -1))} style={styles.monthButton} accessibilityRole="button" accessibilityLabel={t('common.previousMonth')}>
          <Txt variant="title">‹</Txt>
        </Pressable>
        <Txt variant="heading">{formatMonthLabel(month)}</Txt>
        <Pressable onPress={() => changeMonth(addMonths(month, 1))} style={styles.monthButton} accessibilityRole="button" accessibilityLabel={t('common.nextMonth')}>
          <Txt variant="title">›</Txt>
        </Pressable>
      </View>

      {currencies.map((currency) => {
        const items = breakdown
          .filter((b) => b.currency === currency)
          .map((b) => ({ key: b.categoryId ?? 0, label: b.name, value: b.expenseMinor }));
        const shares = topShares(items, TOP);
        const total = items.reduce((sum, i) => sum + i.value, 0);
        const points = trend.filter((point) => point.currency === currency).map((point) => ({ month: point.month, value: point.expenseMinor }));
        return (
          <View key={currency} style={styles.section}>
            <Txt variant="code" tone={currency === 'EUR' ? 'eur' : 'idrText'}>{currency}</Txt>
            <Txt variant="label" tone="inkMuted">{t('categorySummary.expenseIn', { month: formatMonthLabel(month) })}</Txt>
            <Money minor={total} currency={currency} variant="display" />
            <View style={styles.topRule} />

            {shares.length === 0 ? (
              <Txt tone="inkMuted" style={styles.empty}>{t('insights.empty')}</Txt>
            ) : (
              <View style={styles.breakdown}>
                <DonutChart
                  slices={shares.map((s, i) => ({ key: String(s.key), value: s.value, color: hue(currency), opacity: OPACITIES[i] }))}
                  trackColor={color.line}
                />
                <View style={styles.legend}>
                  {shares.map((share, i) => (
                    <View key={String(share.key)} style={styles.legendRow}>
                      <View style={[styles.swatch, { backgroundColor: hue(currency), opacity: OPACITIES[i] }]} />
                      <Txt variant="caption" style={styles.legendLabel} numberOfLines={1}>{share.label}</Txt>
                      <Txt variant="caption" tone="inkMuted" style={styles.percent}>{share.percent}%</Txt>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {shares.length > 0 && (
              <View style={styles.table}>
                {shares.map((share) => (
                  <View key={String(share.key)} style={styles.tableRow}>
                    <Txt style={styles.legendLabel} numberOfLines={1}>{share.label}</Txt>
                    <Money minor={share.value} currency={currency} variant="bodyStrong" />
                  </View>
                ))}
              </View>
            )}

            <Txt variant="label" tone="inkMuted" style={styles.trendTitle}>{t('insights.trend')}</Txt>
            <TrendBars points={points} currency={currency} color={hue(currency)} selected={month} onSelect={changeMonth} />
          </View>
        );
      })}
    </ScrollView>
  );
}

const makeStyles = ({ color, space }: Theme) =>
  StyleSheet.create({
    content: {
      padding: space.lg,
      paddingBottom: space.xxl,
    },
    monthRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    monthButton: {
      minWidth: 48,
      minHeight: 48,
      alignItems: 'center',
      justifyContent: 'center',
    },
    section: {
      marginTop: space.lg,
      paddingBottom: space.lg,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: color.line,
    },
    topRule: {
      height: 1,
      backgroundColor: color.ink,
      marginTop: space.xs,
    },
    empty: {
      paddingVertical: space.lg,
    },
    breakdown: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space.lg,
      marginTop: space.md,
    },
    legend: {
      flex: 1,
      gap: space.xs,
    },
    legendRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space.sm,
    },
    swatch: {
      width: 10,
      height: 10,
      borderRadius: 2,
    },
    legendLabel: {
      flex: 1,
    },
    percent: {
      fontVariant: ['tabular-nums'],
    },
    table: {
      marginTop: space.md,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: color.line,
    },
    tableRow: {
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: 40,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: color.line,
      gap: space.md,
    },
    trendTitle: {
      marginTop: space.lg,
      marginBottom: space.sm,
    },
  });
