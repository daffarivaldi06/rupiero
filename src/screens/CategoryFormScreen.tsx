import React, { useState } from 'react';
import { View, StyleSheet, Alert, Text } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useNavigation, useRoute } from '@react-navigation/native';

import { addCategory, updateCategory } from '../db/database';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { colors } from '../theme/colors';

export default function CategoryFormScreen() {
  const db = useSQLiteContext();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  
  const categoryId = route.params?.categoryId;
  const initialName = route.params?.initialName;
  const isEditing = !!categoryId;

  const [name, setName] = useState(initialName || '');

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a category name');
      return;
    }

    try {
      if (isEditing) {
        await updateCategory(db, categoryId, initialName, name.trim());
        // Navigate back to detail with updated name to refresh params
        navigation.navigate('CategoryDetail', { category: name.trim(), categoryId });
      } else {
        await addCategory(db, name.trim());
        navigation.goBack();
      }
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Category name already exists or failed to save');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{isEditing ? 'Edit Category' : 'New Category'}</Text>
      <Text style={styles.subtitle}>
        {isEditing 
          ? 'Rename this category and update all linked transactions' 
          : 'Create a new category card for your dashboard'}
      </Text>
      
      <Input
        label="Category Name"
        placeholder="e.g. Shopping, Hobby"
        value={name}
        onChangeText={setName}
        autoFocus
      />

      <Button 
        title={isEditing ? 'Update Category' : 'Create Category'} 
        onPress={handleSave} 
        style={styles.button}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: colors.background,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 32,
  },
  button: {
    marginTop: 16,
  },
});
