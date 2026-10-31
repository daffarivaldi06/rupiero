import React, { useState, useCallback, useLayoutEffect } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Pressable, Alert } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useFocusEffect, useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { deleteCategoryWithTransactions } from '../db/repos/categories';
import { getMonthSummary } from '../db/repos/reports';
import { listTransactions } from '../db/repos/transactions';
import { currentMonth } from '../domain/dates';
import { groupByDate } from '../domain/ledger';
import type { CurrencyTotals, TransactionDetail } from '../domain/types';
import { Button } from '../components/Button';
import { LedgerRow } from '../components/LedgerRow';
import { LedgerSection } from '../components/LedgerSection';
import { CategoryMonthSummary } from '../components/CategoryMonthSummary';
import { Txt } from '../components/Txt';
import { useTheme, useThemedStyles, type Theme } from '../theme/ThemeProvider';
import { RootStackParamList } from '../../App';

const signed = (t: TransactionDetail) => (t.type === 'income' ? t.amountMinor : -t.amountMinor);

export default function CategoryDetailScreen() {
  const db = useSQLiteContext();
  const route = useRoute<RouteProp<RootStackParamList, 'CategoryDetail'>>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { color } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { category, categoryId } = route.params;

  const [totals, setTotals] = useState<CurrencyTotals[]>([]);
  const [transactions, setTransactions] = useState<TransactionDetail[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // Current month only for now; Phase 2 passes the month selected on the dashboard.
  const month = currentMonth();

  const loadData = useCallback(async () => {
    try {
      setTotals(await getMonthSummary(db, month, { categoryId }));
      setTransactions(await listTransactions(db, { month, categoryId }));
    } catch (e) {
      console.error(e);
    }
  }, [db, month, categoryId]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

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
              navigation.navigate('Dashboard');
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
      headerRight: () => (
        <View style={styles.headerActions}>
          <Pressable
            onPress={() => navigation.navigate('CategoryForm', { categoryId, initialName: category })}
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
          onPress={() => navigation.navigate('TransactionForm', { categoryId, initialType: 'income' })}
          style={styles.actionButton}
        />
        <Button
          title="− Pengeluaran"
          variant="outline"
          onPress={() => navigation.navigate('TransactionForm', { categoryId, initialType: 'expense' })}
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
