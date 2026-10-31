import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Pressable, Alert } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useFocusEffect, useRoute, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { getBalance, getTransactions, Transaction, deleteCategory } from '../db/database';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { colors } from '../theme/colors';
import { RootStackParamList } from '../../App';

export default function CategoryDetailScreen() {
  const db = useSQLiteContext();
  const route = useRoute<any>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { category, categoryId } = route.params;

  const [balance, setBalance] = useState({ balance: 0, totalIncome: 0, totalExpense: 0, displayCurrency: 'IDR' });
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // We'll use current month by default for now, can be expanded to filter by month
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;

  const loadData = async () => {
    try {
      const bal = await getBalance(db, { category, month: currentMonth });
      setBalance(bal);
      const txs = await getTransactions(db, { category, month: currentMonth });
      setTransactions(txs);
    } catch (e) {
      console.error(e);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [category])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Category',
      `Are you sure you want to delete "${category}"? This will also delete all transactions in this category.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteCategory(db, categoryId, category);
              navigation.navigate('Dashboard');
            } catch (e) {
              console.error(e);
              Alert.alert('Error', 'Failed to delete category');
            }
          }
        }
      ]
    );
  };

  const sym = balance.displayCurrency === 'EUR' ? '€' : 'Rp';

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
                >
                    <Text style={styles.headerButtonText}>Edit</Text>
                </Pressable>
                <Pressable 
                    onPress={handleDelete}
                    style={[styles.headerButton, { borderColor: colors.danger }]}
                >
                    <Text style={[styles.headerButtonText, { color: colors.danger }]}>Delete</Text>
                </Pressable>
            </View>
        </View>
        <Text style={styles.monthLabel}>Monthly Report - {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</Text>
      </View>

      <Card style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>Category Balance</Text>
        <Text style={styles.balanceText}>{sym} {balance.balance.toLocaleString('id-ID')}</Text>
        
        <View style={styles.summaryRow}>
          <View>
            <Text style={styles.summaryLabel}>Income</Text>
            <Text style={[styles.summaryAmount, { color: colors.primary }]}>
              + {sym} {balance.totalIncome.toLocaleString('id-ID')}
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.summaryLabel}>Expense</Text>
            <Text style={[styles.summaryAmount, { color: colors.danger }]}>
              - {sym} {balance.totalExpense.toLocaleString('id-ID')}
            </Text>
          </View>
        </View>
      </Card>

      <View style={styles.actionRow}>
        <Button 
          title="+ Income" 
          onPress={() => navigation.navigate('TransactionForm', { initialCategory: category, initialType: 'income' })} 
          style={{ flex: 1, marginRight: 8 }}
        />
        <Button 
          title="- Expense" 
          variant="danger"
          onPress={() => navigation.navigate('TransactionForm', { initialCategory: category, initialType: 'expense' })} 
          style={{ flex: 1, marginLeft: 8 }}
        />
      </View>

      <Text style={styles.sectionTitle}>Transactions</Text>
      
      {transactions.length === 0 ? (
        <Text style={styles.emptyText}>No transactions for this category yet.</Text>
      ) : (
        transactions.map((t) => {
          const txSym = t.currency === 'EUR' ? '€' : 'Rp';
          return (
            <Card key={t.id} style={styles.txCard}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={styles.txNote}>{t.note || 'No description'}</Text>
                    {t.isRecurring === 1 && (
                        <View style={styles.recurringBadge}>
                            <Text style={styles.recurringText}>Monthly</Text>
                        </View>
                    )}
                </View>
                <Text style={styles.txDate}>{new Date(t.date).toLocaleDateString()}</Text>
              </View>
              <Text style={[styles.txAmount, { color: t.type === 'income' ? colors.primary : colors.danger }]}>
                {t.type === 'income' ? '+' : '-'} {txSym} {t.amount.toLocaleString('id-ID')}
              </Text>
            </Card>
          );
        })
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
  balanceCard: {
    alignItems: 'center',
    paddingVertical: 24,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
  },
  balanceLabel: {
    color: colors.textSecondary,
    fontSize: 14,
    marginBottom: 8,
  },
  balanceText: {
    color: colors.text,
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 20,
  },
  summaryLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    marginBottom: 4,
  },
  summaryAmount: {
    fontSize: 14,
    fontWeight: '600',
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
  recurringBadge: {
    backgroundColor: colors.primaryDark,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 8,
  },
  recurringText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  }
});
