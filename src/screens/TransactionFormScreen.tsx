import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, Text, Switch, Pressable } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useNavigation, useRoute } from '@react-navigation/native';

import { addTransaction, getCategories, Category } from '../db/database';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { colors } from '../theme/colors';

export default function TransactionFormScreen() {
  const db = useSQLiteContext();
  const navigation = useNavigation();
  const route = useRoute<any>();
  
  const initialCategory = route.params?.initialCategory;
  const initialType = route.params?.initialType;

  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'income' | 'expense'>(initialType || 'expense');
  const [currency, setCurrency] = useState<'IDR' | 'EUR'>('IDR');
  const [category, setCategory] = useState(initialCategory || '');
  const [note, setNote] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [availableCategories, setAvailableCategories] = useState<Category[]>([]);

  useEffect(() => {
    const loadCategories = async () => {
      const cats = await getCategories(db);
      setAvailableCategories(cats);
    };
    loadCategories();
  }, []);

  const handleSave = async () => {
    if (!amount || isNaN(Number(amount))) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }
    if (!category) {
      Alert.alert('Error', 'Please enter or select a category');
      return;
    }

    try {
      await addTransaction(db, {
        amount: Number(amount),
        type,
        category,
        note,
        date: new Date().toISOString(),
        currency,
        isRecurring: isRecurring ? 1 : 0,
      });
      navigation.goBack();
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to save transaction');
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.sectionLabel}>Transaction Type</Text>
      <View style={styles.typeSelector}>
        <Button 
          title="Expense" 
          variant={type === 'expense' ? 'danger' : 'outline'}
          onPress={() => !initialType && setType('expense')}
          style={{ flex: 1, marginRight: 5, opacity: initialType && type !== 'expense' ? 0.3 : 1 }}
        />
        <Button 
          title="Income" 
          variant={type === 'income' ? 'primary' : 'outline'}
          onPress={() => !initialType && setType('income')}
          style={{ flex: 1, marginLeft: 5, opacity: initialType && type !== 'income' ? 0.3 : 1 }}
        />
      </View>

      <Text style={styles.sectionLabel}>Currency</Text>
      <View style={{ flexDirection: 'row', marginBottom: 20 }}>
        <Button 
          title="IDR" 
          variant={currency === 'IDR' ? 'primary' : 'outline'}
          onPress={() => setCurrency('IDR')}
          style={{ flex: 1, marginRight: 5 }}
        />
        <Button 
          title="EUR" 
          variant={currency === 'EUR' ? 'primary' : 'outline'}
          onPress={() => setCurrency('EUR')}
          style={{ flex: 1, marginLeft: 5 }}
        />
      </View>

      <Input 
        label={`Amount (${currency === 'IDR' ? 'Rp' : '€'})`} 
        placeholder="0" 
        keyboardType="numeric"
        isCurrency={true}
        value={amount}
        onChangeText={setAmount}
      />

      {initialCategory ? (
        <View style={styles.scopedCategoryRow}>
            <Text style={styles.scopedLabel}>Category</Text>
            <View style={styles.scopedBadge}>
                <Text style={styles.scopedText}>{initialCategory}</Text>
            </View>
        </View>
      ) : (
        <View style={{ marginBottom: 16 }}>
             <Text style={styles.sectionLabel}>Category</Text>
             <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll}>
                {availableCategories.map(cat => (
                    <Pressable 
                        key={cat.id} 
                        onPress={() => setCategory(cat.name)}
                        style={[
                            styles.catBadge, 
                            category === cat.name && { backgroundColor: colors.primary, borderColor: colors.primary }
                        ]}
                    >
                        <Text style={[styles.catBadgeText, category === cat.name && { color: '#000' }]}>{cat.name}</Text>
                    </Pressable>
                ))}
             </ScrollView>
             <Input 
                placeholder="Or type custom category" 
                value={category}
                onChangeText={setCategory}
            />
        </View>
      )}

      <Input 
        label="Note (Optional)" 
        placeholder="Additional details" 
        value={note}
        onChangeText={setNote}
        multiline
      />

      <View style={styles.recurringRow}>
        <View>
            <Text style={styles.recurringTitle}>Recurring Monthly?</Text>
            <Text style={styles.recurringSubtitle}>Repeat this transaction every month</Text>
        </View>
        <Switch
            value={isRecurring}
            onValueChange={setIsRecurring}
            trackColor={{ false: colors.border, true: colors.primaryDark }}
            thumbColor={isRecurring ? colors.primary : colors.textSecondary}
        />
      </View>

      <Button title="Save Transaction" onPress={handleSave} style={styles.saveButton} />
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
  sectionLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  typeSelector: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  saveButton: {
    marginTop: 20,
  },
  scopedCategoryRow: {
    marginBottom: 20,
    padding: 12,
    backgroundColor: colors.surface,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  scopedLabel: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  scopedBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
  },
  scopedText: {
    color: '#000',
    fontWeight: 'bold',
  },
  catScroll: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  catBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 8,
  },
  catBadgeText: {
    color: colors.text,
    fontSize: 13,
  },
  recurringRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 12,
    marginTop: 10,
    marginBottom: 10,
  },
  recurringTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  recurringSubtitle: {
    color: colors.textSecondary,
    fontSize: 12,
  }
});
