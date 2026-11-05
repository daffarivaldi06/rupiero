// Dashboard lists shared by the phone layout and the wide web layout (DashboardWide.web.tsx).
// Each returns a fragment (header + ruled list), so the phone layout renders the same tree as before.
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import type { BudgetLine } from '../../db/repos/budgets';
import type { CategoryCurrencyTotal } from '../../db/repos/reports';
import type { Month } from '../../domain/dates';
import type { BudgetStatus } from '../../domain/budget';
import type { AccountWithBalance, Category, CurrencyTotals } from '../../domain/types';
import { BudgetBar } from '../../components/BudgetBar';
import { Money } from '../../components/Money';
import { Txt } from '../../components/Txt';
import { useI18n } from '../../i18n/I18nProvider';
import type { RootNavigation } from '../../navigation/types';
import { useThemedStyles, type Theme } from '../../theme/ThemeProvider';

interface BudgetsSectionProps {
  /** Every budget of the month (decides between "Set" and "All", and "no budgets"). */
  budgets: BudgetLine[];
  /** The rows to draw, in order. */
  shown: { line: BudgetLine; status: BudgetStatus }[];
  /** Shown when there are budgets but no rows to draw. */
  emptyNote: string;
  month: Month;
  /** Below the rows, e.g. "All budgets →" when only the top ones are shown. */
  footer?: React.ReactNode;
}

export function BudgetsSection({ budgets, shown, emptyNote, month, footer }: BudgetsSectionProps) {
  const styles = useThemedStyles(makeStyles);
  const navigation = useNavigation<RootNavigation>();
  const { t } = useI18n();
  return (
    <>
      <View style={styles.sectionHeader}>
        <Txt variant="title" style={styles.rowText}>{t('common.budget')}</Txt>
        <Pressable onPress={() => navigation.navigate('Budget', { month })} style={styles.headerLink} accessibilityRole="button">
          <Txt variant="bodyStrong">{t(budgets.length === 0 ? 'common.set' : 'common.all')}</Txt>
        </Pressable>
      </View>
      <View style={styles.list}>
        {budgets.length === 0 ? (
          <Txt tone="inkMuted" style={styles.note}>{t('dashboard.noBudgets')}</Txt>
        ) : shown.length === 0 ? (
          <Txt tone="inkMuted" style={styles.note}>{emptyNote}</Txt>
        ) : (
          shown.map(({ line, status }) => (
            <Pressable
              key={`${line.categoryId}-${line.currency}`}
              onPress={() => navigation.navigate('CategoryDetail', { categoryId: line.categoryId, month })}
              style={styles.budgetRow}
              accessibilityRole="button"
            >
              <Txt variant="bodyStrong" numberOfLines={1}>{line.categoryName}</Txt>
              <BudgetBar status={status} currency={line.currency} />
            </Pressable>
          ))
        )}
        {footer}
      </View>
    </>
  );
}

export function AccountsSection({ accounts, month }: { accounts: AccountWithBalance[]; month: Month }) {
  const styles = useThemedStyles(makeStyles);
  const navigation = useNavigation<RootNavigation>();
  const { t } = useI18n();
  return (
    <>
      <View style={styles.sectionHeader}>
        <Txt variant="title" style={styles.rowText}>{t('nav.accounts')}</Txt>
        <Pressable onPress={() => navigation.navigate('TransferForm')} style={styles.headerLink} accessibilityRole="button">
          <Txt variant="bodyStrong">{t('common.transfer')}</Txt>
        </Pressable>
        <Pressable onPress={() => navigation.navigate('Accounts')} style={styles.headerLink} accessibilityRole="button">
          <Txt variant="bodyStrong">{t('common.manage')}</Txt>
        </Pressable>
      </View>
      <View style={styles.list}>
        {accounts.map((account) => (
          <Pressable
            key={account.id}
            onPress={() => navigation.navigate('Transactions', { month, accountId: account.id })}
            style={styles.row}
            accessibilityRole="button"
          >
            <View style={styles.rowText}>
              <Txt numberOfLines={1}>{account.name}</Txt>
              <Txt variant="code" tone={account.currency === 'EUR' ? 'eur' : 'idrText'}>{account.currency}</Txt>
            </View>
            <Money
              minor={account.balanceMinor}
              currency={account.currency}
              variant="bodyStrong"
              tone={account.balanceMinor < 0 ? 'expense' : 'neutral'}
            />
            <Txt tone="inkMuted" style={styles.chevron}>›</Txt>
          </Pressable>
        ))}
      </View>
    </>
  );
}

interface CategoriesSectionProps {
  categories: Category[];
  categoryTotals: CategoryCurrencyTotal[];
  totals: CurrencyTotals[];
  month: Month;
}

export function CategoriesSection({ categories, categoryTotals, totals, month }: CategoriesSectionProps) {
  const styles = useThemedStyles(makeStyles);
  const navigation = useNavigation<RootNavigation>();
  const { t } = useI18n();
  const fees = totals.filter((total) => total.feeMinor > 0);
  return (
    <>
      <Txt variant="title" style={styles.sectionTitle}>{t('nav.categories')}</Txt>
      <View style={styles.list}>
        {categories.map((cat) => {
          const catTotals = categoryTotals.filter((total) => total.categoryId === cat.id);
          return (
            <Pressable
              key={cat.id}
              onPress={() => navigation.navigate('CategoryDetail', { categoryId: cat.id, month })}
              style={styles.row}
              accessibilityRole="button"
            >
              <Txt style={styles.rowText} numberOfLines={1}>{cat.name}</Txt>
              <View style={styles.rowTotals}>
                {catTotals.map((total) => (
                  <Money key={total.currency} minor={total.netMinor} currency={total.currency} variant="label" tone="signed" sign />
                ))}
              </View>
              <Txt tone="inkMuted" style={styles.chevron}>›</Txt>
            </Pressable>
          );
        })}
        {fees.length > 0 && (
          <View style={styles.row}>
            <Txt style={styles.rowText} numberOfLines={1}>{t('common.transferFee')}</Txt>
            <View style={styles.rowTotals}>
              {fees.map((fee) => (
                <Money key={fee.currency} minor={-fee.feeMinor} currency={fee.currency} variant="label" tone="expense" />
              ))}
            </View>
            <View style={styles.chevronSpace} />
          </View>
        )}
        <Pressable onPress={() => navigation.navigate('CategoryForm')} style={styles.row} accessibilityRole="button">
          <Txt variant="bodyStrong">{t('categories.add')}</Txt>
        </Pressable>
      </View>
    </>
  );
}

export const makeStyles = ({ color, space }: Theme) =>
  StyleSheet.create({
    note: {
      paddingVertical: space.md,
    },
    budgetRow: {
      paddingVertical: space.sm,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: color.line,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: space.xl,
      marginBottom: space.xs,
    },
    headerLink: {
      minHeight: 48,
      justifyContent: 'center',
      paddingLeft: space.md,
    },
    sectionTitle: {
      marginTop: space.xl,
      marginBottom: space.xs,
    },
    list: {
      borderTopWidth: 1,
      borderTopColor: color.ink,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: 52,
      paddingVertical: space.xs,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: color.line,
    },
    rowText: {
      flex: 1,
      marginRight: space.sm,
    },
    rowTotals: {
      alignItems: 'flex-end',
    },
    chevron: {
      marginLeft: space.sm,
    },
    // Keeps fee amounts aligned with the chevron rows above.
    chevronSpace: {
      width: 14,
    },
  });
