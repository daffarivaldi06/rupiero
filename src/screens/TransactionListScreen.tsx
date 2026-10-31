import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { useSQLiteContext } from '../db/DatabaseProvider';
import { useFocusEffect, useNavigation, useRoute, type RouteProp } from '@react-navigation/native';

import { listAccounts } from '../db/repos/accounts';
import { getCategory } from '../db/repos/categories';
import { listLedger, type LedgerItem, type LedgerTypeFilter } from '../db/repos/ledger';
import { addMonths, currentMonth, formatMonthLabel } from '../domain/dates';
import { groupByDate, type DayTotal } from '../domain/ledger';
import type { Account } from '../domain/types';
import { LedgerRow } from '../components/LedgerRow';
import { LedgerDayHeader } from '../components/LedgerSection';
import { Txt } from '../components/Txt';
import { Button } from '../components/Button';
import { LoadError } from '../components/LoadError';
import type { RootNavigation, RootStackParamList } from '../navigation/types';
import { useDataRevision } from '../data/DataProvider';
import { useQuickAdd } from '../quickadd/QuickAddProvider';
import { useThemedStyles, type Theme } from '../theme/ThemeProvider';
import { useReadableInset } from '../theme/layout';
import { space } from '../theme/tokens';
import { useI18n } from '../i18n/I18nProvider';
import { t as translate, type MessageKey } from '../i18n';

const PAGE_SIZE = 50;

const TYPES: { value: LedgerTypeFilter; labelKey: MessageKey }[] = [
  { value: 'all', labelKey: 'common.all' },
  { value: 'expense', labelKey: 'common.expense' },
  { value: 'income', labelKey: 'common.income' },
  { value: 'transfer', labelKey: 'common.transfer' },
];

type ListItem =
  | { key: string; type: 'day'; date: string; totals?: DayTotal[] }
  | { key: string; type: 'row'; item: LedgerItem };

function describe(item: LedgerItem): { title?: string; subtitle: string } {
  switch (item.kind) {
    case 'tx':
      return item.note
        ? { title: item.note, subtitle: translate('transactions.subtitle', { category: item.categoryName ?? '', account: item.accountName }) }
        : { title: item.categoryName ?? undefined, subtitle: item.accountName };
    case 'transfer_out':
      return { title: translate('transactions.transferTo', { name: item.counterpartyName ?? '' }), subtitle: item.note || item.accountName };
    case 'transfer_in':
      return { title: translate('transactions.transferFrom', { name: item.counterpartyName ?? '' }), subtitle: item.note || item.accountName };
    case 'transfer_fee':
      return { title: translate('common.transferFee'), subtitle: `${item.accountName} → ${item.counterpartyName}` };
  }
}

export default function TransactionListScreen() {
  const db = useSQLiteContext();
  const navigation = useNavigation<RootNavigation>();
  const route = useRoute<RouteProp<RootStackParamList, 'Transactions'>>();
  const styles = useThemedStyles(makeStyles);
  const inset = useReadableInset(space.lg);
  const { t } = useI18n();
  const quickAdd = useQuickAdd();
  const { revision } = useDataRevision();

  const [month, setMonth] = useState(route.params?.month ?? currentMonth());
  const [type, setType] = useState<LedgerTypeFilter>('all');
  const [accountId, setAccountId] = useState<number | undefined>(route.params?.accountId);
  const [categoryId, setCategoryId] = useState<number | undefined>(route.params?.categoryId);
  const [categoryName, setCategoryName] = useState<string>();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [items, setItems] = useState<LedgerItem[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const loading = useRef(false);
  const [status, setStatus] = useState<'loading' | 'ready' | 'failed'>('loading');

  const filter = useMemo(() => ({ month, type, accountId, categoryId }), [month, type, accountId, categoryId]);

  const reload = useCallback(async () => {
    loading.current = true;
    try {
      const page = await listLedger(db, { ...filter, limit: PAGE_SIZE, offset: 0 });
      setItems(page);
      setHasMore(page.length === PAGE_SIZE);
      setStatus('ready');
    } catch (e) {
      console.error(e);
      setStatus('failed');
    } finally {
      loading.current = false;
    }
  }, [db, filter]);

  const loadMore = async () => {
    if (!hasMore || loading.current) return;
    loading.current = true;
    try {
      const page = await listLedger(db, { ...filter, limit: PAGE_SIZE, offset: items.length });
      setItems((current) => [...current, ...page]);
      setHasMore(page.length === PAGE_SIZE);
    } catch (e) {
      console.error(e);
    } finally {
      loading.current = false;
    }
  };

  useFocusEffect(
    useCallback(() => {
      reload();
      listAccounts(db).then(setAccounts).catch(console.error);
    }, [db, reload]),
  );

  useEffect(() => {
    if (revision > 0) reload();
  }, [revision, reload]);

  useEffect(() => {
    if (categoryId === undefined) return;
    getCategory(db, categoryId).then((c) => setCategoryName(c?.name)).catch(console.error);
  }, [db, categoryId]);

  const data = useMemo<ListItem[]>(() => {
    const days = groupByDate(items, (i) => ({ date: i.date, currency: i.currency, signedMinor: i.signedMinor }));
    return days.flatMap((day) => [
      { key: `day-${day.date}`, type: 'day' as const, date: day.date, totals: day.items.length > 1 ? day.totals : undefined },
      ...day.items.map((item) => ({ key: `${item.kind}-${item.id}`, type: 'row' as const, item })),
    ]);
  }, [items]);

  const open = (item: LedgerItem) => {
    if (item.kind === 'tx') quickAdd.open({ transactionId: item.id });
    else navigation.navigate('TransferForm', { transferId: item.id });
  };

  const chip = (label: string, selected: boolean, onPress: () => void, key: string) => (
    <Pressable
      key={key}
      onPress={onPress}
      style={[styles.chip, selected && styles.chipSelected]}
      hitSlop={4}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
    >
      <Txt variant="label" tone={selected ? 'onInk' : 'ink'} numberOfLines={1}>{label}</Txt>
    </Pressable>
  );

  const header = (
    <View style={styles.filters}>
      <View style={styles.monthRow}>
        <Pressable onPress={() => setMonth(addMonths(month, -1))} style={styles.monthButton} accessibilityRole="button" accessibilityLabel={t('common.previousMonth')}>
          <Txt variant="title">‹</Txt>
        </Pressable>
        <Txt variant="heading">{formatMonthLabel(month)}</Txt>
        <Pressable onPress={() => setMonth(addMonths(month, 1))} style={styles.monthButton} accessibilityRole="button" accessibilityLabel={t('common.nextMonth')}>
          <Txt variant="title">›</Txt>
        </Pressable>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
        {TYPES.map((option) => chip(t(option.labelKey), type === option.value, () => setType(option.value), option.value))}
      </ScrollView>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
        {chip(t('transactions.allAccounts'), accountId === undefined, () => setAccountId(undefined), 'all-accounts')}
        {accounts.map((a) => chip(a.name, accountId === a.id, () => setAccountId(a.id), `account-${a.id}`))}
      </ScrollView>
      {categoryId !== undefined && (
        <View style={styles.chipRow}>
          {chip(`${categoryName ?? t('common.category')}  ✕`, true, () => setCategoryId(undefined), 'category')}
        </View>
      )}
    </View>
  );

  return (
    <FlatList
      data={data}
      keyExtractor={(entry) => entry.key}
      ListHeaderComponent={header}
      contentContainerStyle={[styles.content, { paddingHorizontal: inset }]}
      onEndReached={loadMore}
      onEndReachedThreshold={0.5}
      ListEmptyComponent={
        status === 'loading' ? (
          <ActivityIndicator style={styles.empty} accessibilityLabel={t('common.loading')} />
        ) : status === 'failed' ? (
          <LoadError onRetry={reload} />
        ) : (
          <View style={styles.empty}>
            <Txt tone="inkMuted">{t('transactions.empty')}</Txt>
            <Button title={t('dashboard.add')} variant="outline" onPress={() => quickAdd.open()} style={styles.emptyAction} />
          </View>
        )
      }
      renderItem={({ item: entry }) => {
        if (entry.type === 'day') {
          return (
            <View style={styles.day}>
              <LedgerDayHeader date={entry.date} totals={entry.totals} />
            </View>
          );
        }
        const { title, subtitle } = describe(entry.item);
        return (
          <LedgerRow
            title={title}
            subtitle={subtitle}
            signedMinor={entry.item.signedMinor}
            currency={entry.item.currency}
            onPress={() => open(entry.item)}
          />
        );
      }}
    />
  );
}

const makeStyles = ({ color, radius, space }: Theme) =>
  StyleSheet.create({
    content: {
      paddingHorizontal: space.lg,
      paddingBottom: space.xxl,
    },
    filters: {
      gap: space.sm,
      marginBottom: space.md,
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
    chipRow: {
      flexDirection: 'row',
      gap: space.sm,
    },
    chip: {
      minHeight: 40,
      justifyContent: 'center',
      paddingHorizontal: space.md,
      borderRadius: radius.sm,
      borderWidth: 1,
      borderColor: color.lineStrong,
    },
    chipSelected: {
      backgroundColor: color.ink,
      borderColor: color.ink,
    },
    day: {
      marginTop: space.lg,
    },
    emptyAction: {
      alignSelf: 'flex-start',
    },
    empty: {
      marginTop: space.lg,
    },
  });
