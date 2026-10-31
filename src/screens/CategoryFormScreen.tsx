import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { useSQLiteContext } from '../db/DatabaseProvider';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';

import { createCategory, getCategory, renameCategory } from '../db/repos/categories';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { Txt } from '../components/Txt';
import { useThemedStyles, type Theme } from '../theme/ThemeProvider';
import { useI18n } from '../i18n/I18nProvider';
import type { RootNavigation, RootStackParamList } from '../navigation/types';

export default function CategoryFormScreen() {
  const db = useSQLiteContext();
  const navigation = useNavigation<RootNavigation>();
  const route = useRoute<RouteProp<RootStackParamList, 'CategoryForm'>>();
  const styles = useThemedStyles(makeStyles);
  const { t } = useI18n();

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
      Alert.alert(t('categoryForm.nameEmptyTitle'), t('categoryForm.nameEmpty'));
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
      Alert.alert(t('accountForm.saveFailedTitle'), t('categoryForm.saveFailed'));
    }
  };

  return (
    <View style={styles.container}>
      <Txt tone="inkMuted" style={styles.subtitle}>
        {t(isEditing ? 'categoryForm.editHint' : 'categoryForm.newHint')}
      </Txt>

      <Input
        label={t('categoryForm.name')}
        placeholder={t('categoryForm.namePlaceholder')}
        value={name}
        onChangeText={setName}
        autoFocus
      />

      <Button
        title={t(isEditing ? 'common.saveChanges' : 'categoryForm.create')}
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
