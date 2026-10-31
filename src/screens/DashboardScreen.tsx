import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Pressable, Dimensions } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useFocusEffect, useNavigation } from '@react-navigation/native';

import { getBalance, getCategories, Category } from '../db/database';
import { Card } from '../components/Card';
import { colors } from '../theme/colors';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2;

export default function DashboardScreen() {
  const db = useSQLiteContext();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  
  const [balance, setBalance] = useState({ balance: 0, totalIncome: 0, totalExpense: 0, displayCurrency: 'IDR' });
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const bal = await getBalance(db, { month: selectedMonth });
      setBalance(bal);
      const cats = await getCategories(db);
      setCategories(cats);
    } catch (e) {
      console.error(e);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [selectedMonth])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const changeMonth = (offset: number) => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const date = new Date(year, month - 1 + offset, 1);
    const newYear = date.getFullYear();
    const newMonth = (date.getMonth() + 1).toString().padStart(2, '0');
    setSelectedMonth(`${newYear}-${newMonth}`);
  };

  const sym = balance.displayCurrency === 'EUR' ? '€' : 'Rp';

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      <View style={styles.monthSelector}>
        <Pressable onPress={() => changeMonth(-1)} style={styles.monthButton}>
          <Text style={styles.monthButtonText}>{'<'}</Text>
        </Pressable>
        <Text style={styles.monthText}>
          {new Date(selectedMonth + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </Text>
        <Pressable onPress={() => changeMonth(1)} style={styles.monthButton}>
          <Text style={styles.monthButtonText}>{'>'}</Text>
        </Pressable>
      </View>

      <Card style={styles.globalBalanceCard}>
        <Text style={styles.balanceLabel}>Sisa Uang</Text>
        <Text style={styles.balanceValue}>{sym} {balance.balance.toLocaleString('id-ID')}</Text>
        <View style={styles.summaryRowSmall}>
            <View style={styles.summaryItem}>
                <Text style={styles.summaryLabelSmall}>Income</Text>
                <Text style={[styles.summaryValueSmall, { color: colors.primary }]}>+ {sym} {balance.totalIncome.toLocaleString('id-ID')}</Text>
            </View>
            <View style={styles.summaryItem}>
                <Text style={styles.summaryLabelSmall}>Expense</Text>
                <Text style={[styles.summaryValueSmall, { color: colors.danger }]}>- {sym} {balance.totalExpense.toLocaleString('id-ID')}</Text>
            </View>
        </View>
      </Card>

      <Text style={styles.sectionTitle}>Categories</Text>
      
      <View style={styles.categoryGrid}>
        {categories.map((cat) => (
          <Pressable 
            key={cat.id} 
            onPress={() => navigation.navigate('CategoryDetail', { category: cat.name, categoryId: cat.id })}
          >
            <Card style={styles.categoryCard}>
              <View style={styles.categoryIconCircle}>
                <Text style={styles.categoryEmoji}>{cat.name.charAt(0).toUpperCase()}</Text>
              </View>
              <Text style={styles.categoryName} numberOfLines={1}>{cat.name}</Text>
            </Card>
          </Pressable>
        ))}
        
        <Pressable onPress={() => navigation.navigate('CategoryForm')}>
          <Card style={[styles.categoryCard, styles.addCategoryCard]}>
            <Text style={styles.addIcon}>+</Text>
            <Text style={styles.addText}>Add Category</Text>
          </Card>
        </Pressable>
      </View>

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
  monthSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    backgroundColor: colors.surface,
    padding: 12,
    borderRadius: 12,
  },
  monthButton: {
    paddingHorizontal: 15,
  },
  monthButtonText: {
    color: colors.primary,
    fontSize: 20,
    fontWeight: 'bold',
  },
  monthText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
    marginHorizontal: 20,
  },
  globalBalanceCard: {
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
  balanceValue: {
    color: colors.text,
    fontSize: 32,
    fontWeight: 'bold',
  },
  summaryRowSmall: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 20,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 16,
  },
  summaryItem: {
    alignItems: 'center',
    flex: 1,
  },
  summaryLabelSmall: {
    color: colors.textSecondary,
    fontSize: 11,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  summaryValueSmall: {
    fontSize: 13,
    fontWeight: '700',
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: 'bold',
    marginVertical: 20,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  categoryCard: {
    width: CARD_WIDTH,
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 10,
    marginBottom: 16,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
  },
  categoryIconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.glass,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  categoryEmoji: {
    fontSize: 20,
    color: colors.primary,
    fontWeight: 'bold',
  },
  categoryName: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '500',
  },
  addCategoryCard: {
    backgroundColor: 'transparent',
    borderStyle: 'dashed',
    borderColor: colors.textSecondary,
  },
  addIcon: {
    fontSize: 24,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  addText: {
    color: colors.textSecondary,
    fontSize: 14,
  }
});
