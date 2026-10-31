import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { useSQLiteContext } from '../db/DatabaseProvider';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';

import { createCategory, getCategory, renameCategory } from '../db/repos/categories';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { Txt } from '../components/Txt';
import { useThemedStyles, type Theme } from '../theme/ThemeProvider';
import type { RootNavigation, RootStackParamList } from '../navigation/types';

export default function CategoryFormScreen() {
  const db = useSQLiteContext();
  const navigation = useNavigation<RootNavigation>();
  const route = useRoute<RouteProp<RootStackParamList, 'CategoryForm'>>();
  const styles = useThemedStyles(makeStyles);

  const categoryId = route.params?.categoryId;
  const isEditing = categoryId !== undefined;

  const [name, setName] = useState('');

  useEffect(() => {
    if (categoryId === undefined) return;
    getCategory(db, categoryId)
      .then((category) => category && setName(category.name))
      .catch(console.error);
  }, [db, categoryId]);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Nama kosong', 'Masukkan nama kategori');
      return;
    }

    try {
      if (isEditing) {
        await renameCategory(db, categoryId, name.trim());
      } else {
        await createCategory(db, name.trim());
      }
      // Back to where the form was opened; the detail screen re-reads the name on focus.
      navigation.goBack();
    } catch (e) {
      console.error(e);
      Alert.alert('Gagal menyimpan', 'Nama kategori sudah dipakai atau terjadi kesalahan');
    }
  };

  return (
    <View style={styles.container}>
      <Txt tone="inkMuted" style={styles.subtitle}>
        {isEditing ? 'Transaksinya tetap terhubung ke kategori ini.' : 'Kategori baru muncul di dashboard.'}
      </Txt>

      <Input
        label="Nama Kategori"
        placeholder="mis. Belanja, Hobi"
        value={name}
        onChangeText={setName}
        autoFocus
      />

      <Button
        title={isEditing ? 'Simpan Perubahan' : 'Buat Kategori'}
        onPress={handleSave}
        style={styles.button}
      />
    </View>
  );
}

const makeStyles = ({ space }: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      padding: space.xl,
    },
    subtitle: {
      marginBottom: space.lg,
    },
    button: {
      marginTop: space.lg,
    },
  });
