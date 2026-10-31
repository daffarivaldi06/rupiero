import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Pressable, Alert } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useFocusEffect, useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { deleteCategoryWithTransactions } from '../db/repos/categories';
import { getMonthSummary } from '../db/repos/reports';
import { listTransactions } from '../db/repos/transactions';
import { currentMonth, formatDateLabel, formatMonthLabel } from '../domain/dates';
import { formatMoney } from '../domain/money';
import type { CurrencyTotals, TransactionDetail } from '../domain/types';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { MonthSummaryCard } from '../components/MonthSummaryCard';
import { colors } from '../theme/colors';
import { RootStackParamList } from '../../App';

export default function CategoryDetailScreen() {
  const db = useSQLiteContext();
  const route = useRoute<RouteProp<RootStackParamList, 'CategoryDetail'>>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
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

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
            <Text style={styles.categoryName}>{category}</Text>
            <View style={{ flexDirection: 'row' }}>
                <Pressable
                    onPress={() => navigation.navigate('CategoryForm', { categoryId, initialName: category })}
                    style={[styles.headerButton, { marginRight: 8 }]}
                    accessibilityRole="button"
                >
                    <Text style={styles.headerButtonText}>Ubah</Text>
                </Pressable>
                <Pressable
                    onPress={handleDelete}
                    style={[styles.headerButton, { borderColor: colors.danger }]}
                    accessibilityRole="button"
                >
                    <Text style={[styles.headerButtonText, { color: colors.danger }]}>Hapus</Text>
                </Pressable>
            </View>
        </View>
        <Text style={styles.monthLabel}>Laporan Bulanan - {formatMonthLabel(month)}</Text>
      </View>

      <MonthSummaryCard title="Saldo Kategori" totals={totals} />

      <View style={styles.actionRow}>
        <Button
          title="+ Pemasukan"
          onPress={() => navigation.navigate('TransactionForm', { categoryId, initialType: 'income' })}
          style={{ flex: 1, marginRight: 8 }}
        />
        <Button
          title="- Pengeluaran"
          variant="danger"
          onPress={() => navigation.navigate('TransactionForm', { categoryId, initialType: 'expense' })}
          style={{ flex: 1, marginLeft: 8 }}
        />
      </View>

      <Text style={styles.sectionTitle}>Transaksi</Text>

      {transactions.length === 0 ? (
        <Text style={styles.emptyText}>Belum ada transaksi di kategori ini bulan ini.</Text>
      ) : (
        transactions.map((t) => (
          <Card key={t.id} style={styles.txCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.txNote}>{t.note || 'Tanpa keterangan'}</Text>
              <Text style={styles.txDate}>{formatDateLabel(t.date)} · {t.accountName}</Text>
            </View>
            <Text style={[styles.txAmount, { color: t.type === 'income' ? colors.primary : colors.danger }]}>
              {formatMoney(t.type === 'income' ? t.amountMinor : -t.amountMinor, t.currency, { sign: true })}
            </Text>
          </Card>
        ))
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: colors.background,
  },
  header: {
    marginBottom: 20,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  categoryName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
    flex: 1,
  },
  headerButton: {
    backgroundColor: colors.surfaceLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  headerButtonText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  monthLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 20,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  txCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginVertical: 4,
  },
  txNote: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '500',
  },
  txDate: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 4,
  },
  txAmount: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  emptyText: {
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 20,
  },
});
