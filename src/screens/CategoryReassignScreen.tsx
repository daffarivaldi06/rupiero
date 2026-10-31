import React, { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';

import { getCategory, listCategories, reassignAndDeleteCategory } from '../db/repos/categories';
import type { Category } from '../domain/types';
import { Txt } from '../components/Txt';
import type { RootNavigation, RootStackParamList } from '../navigation/types';
import { useThemedStyles, type Theme } from '../theme/ThemeProvider';

/** Pick where a category's transactions go before the category is deleted. */
export default function CategoryReassignScreen() {
  const db = useSQLiteContext();
  const navigation = useNavigation<RootNavigation>();
  const route = useRoute<RouteProp<RootStackParamList, 'CategoryReassign'>>();
  const styles = useThemedStyles(makeStyles);
  const { categoryId } = route.params;

  const [name, setName] = useState('');
  const [targets, setTargets] = useState<Category[]>([]);

  useEffect(() => {
    (async () => {
      setName((await getCategory(db, categoryId))?.name ?? '');
      setTargets((await listCategories(db)).filter((c) => c.id !== categoryId));
    })().catch(console.error);
  }, [db, categoryId]);

  const choose = (target: Category) => {
    Alert.alert('Pindahkan dan hapus', `Semua transaksi "${name}" pindah ke "${target.name}", lalu "${name}" dihapus.`, [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Pindahkan',
        style: 'destructive',
        onPress: async () => {
          try {
            await reassignAndDeleteCategory(db, categoryId, target.id);
            navigation.popTo('Dashboard');
          } catch (e) {
            console.error(e);
            Alert.alert('Gagal', 'Transaksi tidak dapat dipindahkan');
          }
        },
      },
    ]);
  };

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Txt tone="inkMuted" style={styles.description}>Pindahkan transaksi &quot;{name}&quot; ke:</Txt>
      <View style={styles.list}>
        {targets.map((target) => (
          <Pressable key={target.id} onPress={() => choose(target)} style={styles.row} accessibilityRole="button">
            <Txt style={styles.rowText} numberOfLines={1}>{target.name}</Txt>
            <Txt tone="inkMuted">›</Txt>
          </Pressable>
        ))}
      </View>
      {targets.length === 0 && <Txt tone="inkMuted">Belum ada kategori lain. Buat dulu, atau arsipkan kategori ini.</Txt>}
    </ScrollView>
  );
}

const makeStyles = ({ color, space }: Theme) =>
  StyleSheet.create({
    content: {
      padding: space.lg,
      paddingBottom: space.xxl,
    },
    description: {
      marginBottom: space.md,
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
