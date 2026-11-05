import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { budgetStatus, sortByUsage } from '../../domain/budget';
import { Card } from '../../components/Card';
import { CombinedTotal } from '../../components/CombinedTotal';
import { LedgerRow } from '../../components/LedgerRow';
import { describeLedgerItem } from '../../components/ledgerText';
import { Money } from '../../components/Money';
import { MonthFlow } from '../../components/MonthFlow';
import { Txt } from '../../components/Txt';
import type { LedgerItem } from '../../db/repos/ledger';
import { useI18n } from '../../i18n/I18nProvider';
import type { RootNavigation } from '../../navigation/types';
import { useQuickAdd } from '../../quickadd/QuickAddProvider';
import { useTheme, useThemedStyles, type Theme } from '../../theme/ThemeProvider';
import { AccountsSection, BudgetsSection, CategoriesSection, makeStyles as makeSectionStyles } from './sections';
import type { DashboardWideProps } from './types';

/** Budgets shown before "All budgets →", so the right column stays near the left one's length. */
const MAX_BUDGETS = 6;

/**
 * The Dashboard on wide web screens (ADR 0001): balance cards in a row, then a 2:1 grid with cash
 * flow and recent transactions on the left, budgets, accounts and categories on the right.
 */
export function DashboardWide({
  top,
  balanceLabel,
  balances,
  roll,
  baseCurrency,
  referenceRate,
  flowTitle,
  totals,
  recent,
  budgets,
  accounts,
  categories,
  categoryTotals,
  month,
  isCurrentMonth,
}: DashboardWideProps) {
  const { layout } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const sectionStyles = useThemedStyles(makeSectionStyles);
  const navigation = useNavigation<RootNavigation>();
  const quickAdd = useQuickAdd();
  const { t } = useI18n();

  const ranked = sortByUsage(budgets).map((line) => ({ line, status: budgetStatus(line.spentMinor, line.limitMinor) }));
  const shownBudgets = ranked.slice(0, MAX_BUDGETS);

  const openItem = (item: LedgerItem) => {
    if (item.kind === 'tx') quickAdd.open({ transactionId: item.id });
    else navigation.navigate('TransferForm', { transferId: item.id });
  };

  return (
    <View style={[styles.page, { maxWidth: layout.contentMaxWidth }]}>
      {top}
      <Txt variant="label" tone="inkMuted" style={styles.label}>{balanceLabel}</Txt>
      <View style={styles.cards}>
        {balances.length === 0 ? (
          <Card style={styles.card}>
            <Txt tone="inkMuted">{t('balance.noAccounts')}</Txt>
          </Card>
        ) : (
          <>
            {balances.map((b) => (
              <Card key={b.currency} style={styles.card}>
                <Txt variant="code" tone={b.currency === 'EUR' ? 'eur' : 'idrText'}>{b.currency}</Txt>
                <Money minor={b.balanceMinor} currency={b.currency} size="hero" tone={b.balanceMinor < 0 ? 'expense' : 'neutral'} roll={roll} />
              </Card>
            ))}
            <Card style={styles.card}>
              <CombinedTotal balances={balances} base={baseCurrency} rate={referenceRate} size="hero" />
            </Card>
          </>
        )}
      </View>

      <View style={styles.grid}>
        <View style={styles.main}>
          <MonthFlow title={flowTitle} totals={totals} />
          <View style={sectionStyles.sectionHeader}>
            <Txt variant="title" style={sectionStyles.rowText}>{t('dashboard.recent')}</Txt>
            <Pressable
              onPress={() => navigation.navigate('Transactions', isCurrentMonth ? undefined : { month })}
              style={sectionStyles.headerLink}
              accessibilityRole="link"
            >
              <Txt variant="bodyStrong">{t('dashboard.viewAll')}</Txt>
            </Pressable>
          </View>
          <View style={sectionStyles.list}>
            {recent.length === 0 ? (
              <Txt tone="inkMuted" style={sectionStyles.note}>{t('transactions.empty')}</Txt>
            ) : (
              recent.map((item) => {
                const { title, subtitle } = describeLedgerItem(item);
                return (
                  <LedgerRow
                    key={`${item.kind}-${item.id}-${item.accountId}`}
                    title={title}
                    subtitle={subtitle}
                    signedMinor={item.signedMinor}
                    currency={item.currency}
                    onPress={() => openItem(item)}
                  />
                );
              })
            )}
          </View>
        </View>

        <View style={styles.side}>
          <BudgetsSection
            budgets={budgets}
            shown={shownBudgets}
            emptyNote={t('dashboard.noBudgets')}
            month={month}
            footer={
              ranked.length > MAX_BUDGETS && (
                <Pressable onPress={() => navigation.navigate('Budget', { month })} style={sectionStyles.row} accessibilityRole="link">
                  <Txt variant="bodyStrong">{t('dashboard.allBudgets')}</Txt>
                </Pressable>
              )
            }
          />
          <AccountsSection accounts={accounts} month={month} />
          <CategoriesSection categories={categories} categoryTotals={categoryTotals} totals={totals} month={month} />
        </View>
      </View>
    </View>
  );
}

const makeStyles = ({ space }: Theme) =>
  StyleSheet.create({
    page: {
      width: '100%',
      alignSelf: 'center',
      paddingHorizontal: space.xl,
    },
    label: {
      marginBottom: space.sm,
    },
    cards: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: space.lg,
    },
    card: {
      flexGrow: 1,
      flexBasis: 0,
      minWidth: 220,
      marginVertical: 0,
      gap: space.xs,
    },
    grid: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: space.xl,
      marginTop: space.xl,
    },
    main: {
      flexGrow: 2,
      flexBasis: 0,
      minWidth: 0,
    },
    // The first section of this column (Budget) brings its own top margin; MonthFlow does not.
    side: {
      flexGrow: 1,
      flexBasis: 0,
      minWidth: 300,
      marginTop: -space.xl,
    },
  });
