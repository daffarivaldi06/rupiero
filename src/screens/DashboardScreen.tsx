import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Pressable, Dimensions } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useFocusEffect, useNavigation } from '@react-navigation/native';

import { listCategories } from '../db/repos/categories';
import { getMonthSummary } from '../db/repos/reports';
import { addMonths, currentMonth, formatMonthLabel } from '../domain/dates';
import type { Category, CurrencyTotals } from '../domain/types';
import { Card } from '../components/Card';
import { MonthSummaryCard } from '../components/MonthSummaryCard';
import { colors } from '../theme/colors';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2;

export default function DashboardScreen() {
  const db = useSQLiteContext();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [totals, setTotals] = useState<CurrencyTotals[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth());
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setTotals(await getMonthSummary(db, selectedMonth));
      setCategories(await listCategories(db));
    } catch (e) {
      console.error(e);
    }
  }, [db, selectedMonth]);

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

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      <View style={styles.monthSelector}>
        <Pressable
          onPress={() => setSelectedMonth(addMonths(selectedMonth, -1))}
          style={styles.monthButton}
          accessibilityRole="button"
          accessibilityLabel="Bulan sebelumnya"
          hitSlop={8}
        >
          <Text style={styles.monthButtonText}>{'<'}</Text>
        </Pressable>
        <Text style={styles.monthText}>{formatMonthLabel(selectedMonth)}</Text>
        <Pressable
          onPress={() => setSelectedMonth(addMonths(selectedMonth, 1))}
          style={styles.monthButton}
          accessibilityRole="button"
          accessibilityLabel="Bulan berikutnya"
          hitSlop={8}
        >
          <Text style={styles.monthButtonText}>{'>'}</Text>
        </Pressable>
      </View>

      <MonthSummaryCard title="Sisa Uang Bulan Ini" totals={totals} />

      <Text style={styles.sectionTitle}>Kategori</Text>

      <View style={styles.categoryGrid}>
        {categories.map((cat) => (
          <Pressable
            key={cat.id}
            onPress={() => navigation.navigate('CategoryDetail', { category: cat.name, categoryId: cat.id })}
            accessibilityRole="button"
          >
            <Card style={styles.categoryCard}>
              <View style={styles.categoryIconCircle}>
                <Text style={styles.categoryEmoji}>{cat.name.charAt(0).toUpperCase()}</Text>
              </View>
              <Text style={styles.categoryName} numberOfLines={1}>{cat.name}</Text>
            </Card>
          </Pressable>
        ))}

        <Pressable onPress={() => navigation.navigate('CategoryForm')} accessibilityRole="button">
          <Card style={[styles.categoryCard, styles.addCategoryCard]}>
            <Text style={styles.addIcon}>+</Text>
            <Text style={styles.addText}>Tambah Kategori</Text>
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
