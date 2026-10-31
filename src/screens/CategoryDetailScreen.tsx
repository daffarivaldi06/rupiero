import React, { useState, useCallback, useEffect, useLayoutEffect } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Pressable, Alert } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useFocusEffect, useRoute, useNavigation, RouteProp } from '@react-navigation/native';

import { deleteCategoryWithTransactions, getCategory } from '../db/repos/categories';
import { getMonthSummary } from '../db/repos/reports';
import { listTransactions } from '../db/repos/transactions';
import { groupByDate } from '../domain/ledger';
import type { CurrencyTotals, TransactionDetail } from '../domain/types';
import { Button } from '../components/Button';
import { LedgerRow } from '../components/LedgerRow';
import { LedgerSection } from '../components/LedgerSection';
import { CategoryMonthSummary } from '../components/CategoryMonthSummary';
import { Txt } from '../components/Txt';
import { useTheme, useThemedStyles, type Theme } from '../theme/ThemeProvider';
import type { RootNavigation, RootStackParamList } from '../navigation/types';
import { useQuickAdd } from '../quickadd/QuickAddProvider';

const signed = (t: TransactionDetail) => (t.type === 'income' ? t.amountMinor : -t.amountMinor);

export default function CategoryDetailScreen() {
  const db = useSQLiteContext();
  const route = useRoute<RouteProp<RootStackParamList, 'CategoryDetail'>>();
  const navigation = useNavigation<RootNavigation>();
  const { color } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { categoryId, month } = route.params;
  const quickAdd = useQuickAdd();

  const [category, setCategory] = useState('');
  const [totals, setTotals] = useState<CurrencyTotals[]>([]);
  const [transactions, setTransactions] = useState<TransactionDetail[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const found = await getCategory(db, categoryId);
      if (!found) {
        // Deleted elsewhere: nothing left to show.
        navigation.popTo('Dashboard');
        return;
      }
      setCategory(found.name);
      setTotals(await getMonthSummary(db, month, { categoryId }));
      setTransactions(await listTransactions(db, { month, categoryId }));
    } catch (e) {
      console.error(e);
    }
  }, [db, month, categoryId, navigation]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  // The quick-add sheet opens over this screen, so focus does not change when it saves or deletes.
  useEffect(() => {
    if (quickAdd.revision > 0) loadData();
  }, [quickAdd.revision, loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleDelete = () => {
    Alert.alert(
      'Hapus Kategori',
      `Yakin ingin menghapus "${category}"? Semua transaksi di kategori ini juga akan dihapus.`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteCategoryWithTransactions(db, categoryId);
              navigation.popTo('Dashboard');
            } catch (e) {
              console.error(e);
              Alert.alert('Gagal', 'Kategori tidak dapat dihapus');
            }
          }
        }
      ]
    );
  };

  useLayoutEffect(() => {
    navigation.setOptions({
      title: category,
      headerRight: () => (
        <View style={styles.headerActions}>
          <Pressable
            onPress={() => navigation.navigate('CategoryForm', { categoryId })}
            style={styles.headerButton}
            accessibilityRole="button"
          >
            <Txt variant="bodyStrong">Ubah</Txt>
          </Pressable>
          <Pressable onPress={handleDelete} style={styles.headerButton} accessibilityRole="button">
            <Txt variant="bodyStrong" tone="expense">Hapus</Txt>
          </Pressable>
        </View>
      ),
    });
  });

  const days = groupByDate(transactions, (t) => ({ date: t.date, currency: t.currency, signedMinor: signed(t) }));

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={color.ink} />}
    >
      <CategoryMonthSummary month={month} totals={totals} />

      <View style={styles.actionRow}>
        <Button
          title="+ Pemasukan"
          variant="outline"
          onPress={() => quickAdd.open({ categoryId, type: 'income' })}
          style={styles.actionButton}
        />
        <Button
          title="− Pengeluaran"
          variant="outline"
          onPress={() => quickAdd.open({ categoryId, type: 'expense' })}
          style={styles.actionButton}
        />
      </View>

      <Txt variant="title" style={styles.sectionTitle}>Transaksi</Txt>
      {days.length === 0 ? (
        <Txt tone="inkMuted" style={styles.emptyText}>Belum ada transaksi di kategori ini bulan ini.</Txt>
      ) : (
        days.map((day) => (
          <LedgerSection key={day.date} date={day.date} totals={day.items.length > 1 ? day.totals : undefined}>
            {day.items.map((t) => (
              <LedgerRow
                key={t.id}
                title={t.note || undefined}
                subtitle={t.accountName}
                signedMinor={signed(t)}
                currency={t.currency}
                onPress={() => quickAdd.open({ transactionId: t.id })}
              />
            ))}
          </LedgerSection>
        ))
      )}
    </ScrollView>
  );
}

const makeStyles = ({ space }: Theme) =>
  StyleSheet.create({
    content: {
      padding: space.lg,
      paddingBottom: space.xxl,
    },
    headerActions: {
      flexDirection: 'row',
    },
    headerButton: {
      minHeight: 48,
      justifyContent: 'center',
      paddingHorizontal: space.sm,
    },
    actionRow: {
      flexDirection: 'row',
      gap: space.md,
      marginTop: space.lg,
    },
    actionButton: {
      flex: 1,
    },
    sectionTitle: {
      marginTop: space.xl,
      marginBottom: space.sm,
    },
    emptyText: {
      marginTop: space.sm,
    },
  });
