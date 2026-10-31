import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { useSQLiteContext } from 'expo-sqlite';
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
import type { RootNavigation, RootStackParamList } from '../navigation/types';
import { useQuickAdd } from '../quickadd/QuickAddProvider';
import { useThemedStyles, type Theme } from '../theme/ThemeProvider';

const PAGE_SIZE = 50;

const TYPES: { value: LedgerTypeFilter; label: string }[] = [
  { value: 'all', label: 'Semua' },
  { value: 'expense', label: 'Pengeluaran' },
  { value: 'income', label: 'Pemasukan' },
  { value: 'transfer', label: 'Transfer' },
];

type ListItem =
  | { key: string; type: 'day'; date: string; totals?: DayTotal[] }
  | { key: string; type: 'row'; item: LedgerItem };

function describe(item: LedgerItem): { title?: string; subtitle: string } {
  switch (item.kind) {
    case 'tx':
      return item.note
        ? { title: item.note, subtitle: `${item.categoryName} · ${item.accountName}` }
        : { title: item.categoryName ?? undefined, subtitle: item.accountName };
    case 'transfer_out':
      return { title: `Transfer ke ${item.counterpartyName}`, subtitle: item.note || item.accountName };
    case 'transfer_in':
      return { title: `Transfer dari ${item.counterpartyName}`, subtitle: item.note || item.accountName };
    case 'transfer_fee':
      return { title: 'Biaya transfer', subtitle: `${item.accountName} → ${item.counterpartyName}` };
  }
}

export default function TransactionListScreen() {
  const db = useSQLiteContext();
  const navigation = useNavigation<RootNavigation>();
  const route = useRoute<RouteProp<RootStackParamList, 'Transactions'>>();
  const styles = useThemedStyles(makeStyles);
  const quickAdd = useQuickAdd();

  const [month, setMonth] = useState(route.params?.month ?? currentMonth());
  const [type, setType] = useState<LedgerTypeFilter>('all');
  const [accountId, setAccountId] = useState<number | undefined>(route.params?.accountId);
  const [categoryId, setCategoryId] = useState<number | undefined>(route.params?.categoryId);
  const [categoryName, setCategoryName] = useState<string>();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [items, setItems] = useState<LedgerItem[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const loading = useRef(false);

  const filter = useMemo(() => ({ month, type, accountId, categoryId }), [month, type, accountId, categoryId]);

  const reload = useCallback(async () => {
    loading.current = true;
    try {
      const page = await listLedger(db, { ...filter, limit: PAGE_SIZE, offset: 0 });
      setItems(page);
      setHasMore(page.length === PAGE_SIZE);
    } catch (e) {
      console.error(e);
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
    if (quickAdd.revision > 0) reload();
  }, [quickAdd.revision, reload]);

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
      accessibilityRole="radio"
      accessibilityState={{ selected }}
    >
      <Txt variant="label" tone={selected ? 'onInk' : 'ink'} numberOfLines={1}>{label}</Txt>
    </Pressable>
  );

  const header = (
    <View style={styles.filters}>
      <View style={styles.monthRow}>
        <Pressable onPress={() => setMonth(addMonths(month, -1))} style={styles.monthButton} accessibilityRole="button" accessibilityLabel="Bulan sebelumnya">
          <Txt variant="title">‹</Txt>
        </Pressable>
        <Txt variant="heading">{formatMonthLabel(month)}</Txt>
        <Pressable onPress={() => setMonth(addMonths(month, 1))} style={styles.monthButton} accessibilityRole="button" accessibilityLabel="Bulan berikutnya">
          <Txt variant="title">›</Txt>
        </Pressable>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
        {TYPES.map((t) => chip(t.label, type === t.value, () => setType(t.value), t.value))}
      </ScrollView>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
        {chip('Semua akun', accountId === undefined, () => setAccountId(undefined), 'all-accounts')}
        {accounts.map((a) => chip(a.name, accountId === a.id, () => setAccountId(a.id), `account-${a.id}`))}
      </ScrollView>
      {categoryId !== undefined && (
        <View style={styles.chipRow}>
          {chip(`${categoryName ?? 'Kategori'}  ✕`, true, () => setCategoryId(undefined), 'category')}
        </View>
      )}
    </View>
  );

  return (
    <FlatList
      data={data}
      keyExtractor={(entry) => entry.key}
      ListHeaderComponent={header}
      contentContainerStyle={styles.content}
      onEndReached={loadMore}
      onEndReachedThreshold={0.5}
      ListEmptyComponent={<Txt tone="inkMuted" style={styles.empty}>Tidak ada transaksi untuk filter ini.</Txt>}
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
    empty: {
      marginTop: space.lg,
    },
  });
