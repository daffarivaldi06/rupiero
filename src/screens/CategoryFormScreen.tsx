import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { createCategory, renameCategory } from '../db/repos/categories';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { Txt } from '../components/Txt';
import { useThemedStyles, type Theme } from '../theme/ThemeProvider';
import { RootStackParamList } from '../../App';

export default function CategoryFormScreen() {
  const db = useSQLiteContext();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'CategoryForm'>>();
  const styles = useThemedStyles(makeStyles);

  const categoryId = route.params?.categoryId;
  const initialName = route.params?.initialName;
  const isEditing = categoryId !== undefined;

  const [name, setName] = useState(initialName || '');

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Nama kosong', 'Masukkan nama kategori');
      return;
    }

    try {
      if (isEditing) {
        await renameCategory(db, categoryId, name.trim());
        // Navigate back to detail with updated name to refresh params
        navigation.navigate('CategoryDetail', { category: name.trim(), categoryId });
      } else {
        await createCategory(db, name.trim());
        navigation.goBack();
      }
    } catch (e) {
      console.error(e);
      Alert.alert('Gagal menyimpan', 'Nama kategori sudah dipakai atau terjadi kesalahan');
    }
  };

  return (
    <View style={styles.container}>
      <Txt variant="title">{isEditing ? 'Ubah Kategori' : 'Kategori Baru'}</Txt>
      <Txt tone="inkMuted" style={styles.subtitle}>
        {isEditing
          ? 'Ganti nama kategori ini. Transaksinya tetap terhubung.'
          : 'Buat kategori baru di dashboard'}
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
      marginTop: space.xs,
      marginBottom: space.xl,
    },
    button: {
      marginTop: space.lg,
    },
  });
