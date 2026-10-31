import React, { useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Pressable } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { listCategories } from '../db/repos/categories';
import { getMonthSummary } from '../db/repos/reports';
import { currentMonth } from '../domain/dates';
import type { Category, CurrencyTotals } from '../domain/types';
import { AppHeader } from '../components/AppHeader';
import { MonthSummaryCard } from '../components/MonthSummaryCard';
import { Txt } from '../components/Txt';
import { useTheme, useThemedStyles, type Theme } from '../theme/ThemeProvider';
import { RootStackParamList } from '../../App';

export default function DashboardScreen() {
  const db = useSQLiteContext();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { color } = useTheme();
  const styles = useThemedStyles(makeStyles);

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
    <View style={styles.screen}>
      <AppHeader
        month={selectedMonth}
        onChangeMonth={setSelectedMonth}
        onPressSettings={() => navigation.navigate('Settings')}
      />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={color.ink} />}
      >

        <MonthSummaryCard title="Sisa uang bulan ini" totals={totals} />

        <Txt variant="title" style={styles.sectionTitle}>Kategori</Txt>
        <View style={styles.list}>
          {categories.map((cat) => (
            <Pressable
              key={cat.id}
              onPress={() => navigation.navigate('CategoryDetail', { category: cat.name, categoryId: cat.id })}
              style={styles.row}
              accessibilityRole="button"
            >
              <Txt style={styles.rowText} numberOfLines={1}>{cat.name}</Txt>
              <Txt tone="inkMuted">›</Txt>
            </Pressable>
          ))}
          <Pressable onPress={() => navigation.navigate('CategoryForm')} style={styles.row} accessibilityRole="button">
            <Txt variant="bodyStrong">+ Tambah kategori</Txt>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const makeStyles = ({ color, space }: Theme) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: color.bg,
    },
    content: {
      padding: space.lg,
      paddingBottom: space.xxl,
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
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: color.line,
    },
    rowText: {
      flex: 1,
    },
  });
