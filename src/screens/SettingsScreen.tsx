import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text, Alert, ScrollView } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';

import { getSettings, updateSettings, AppSettings, resetTransactions } from '../db/database';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { colors } from '../theme/colors';

export default function SettingsScreen() {
  const db = useSQLiteContext();
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [tempRate, setTempRate] = useState('');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const s = await getSettings(db);
    setSettings(s);
    setTempRate(s.eurToIdrRate.toString());
  };

  const handleToggleCurrency = async (currency: 'IDR' | 'EUR') => {
    if (!settings) return;
    try {
      await updateSettings(db, currency, settings.eurToIdrRate);
      setSettings({ ...settings, displayCurrency: currency });
      Alert.alert('Success', `Display currency changed to ${currency}`);
    } catch (e) {
      Alert.alert('Error', 'Failed to update settings');
    }
  };

  const handleUpdateRate = async () => {
    if (!settings || !tempRate) return;
    const newRate = parseFloat(tempRate);
    if (isNaN(newRate) || newRate <= 0) {
      Alert.alert('Error', 'Please enter a valid rate');
      return;
    }

    try {
      await updateSettings(db, settings.displayCurrency, newRate);
      setSettings({ ...settings, eurToIdrRate: newRate });
      Alert.alert('Success', 'Exchange rate updated');
    } catch (e) {
      Alert.alert('Error', 'Failed to update rate');
    }
  };

  const handleReset = () => {
    Alert.alert(
      'Reset All Transactions',
      'Are you sure you want to delete all transactions? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete Everything', 
          style: 'destructive',
          onPress: async () => {
            try {
              await resetTransactions(db);
              Alert.alert('Success', 'All transactions have been deleted');
            } catch (e) {
              Alert.alert('Error', 'Failed to reset transactions');
            }
          }
        }
      ]
    );
  };

  if (!settings) return null;

  return (
    <ScrollView style={styles.container}>
      <Card>
        <Text style={styles.sectionTitle}>Global Display Currency</Text>
        <Text style={styles.description}>
          Choose the default currency for your dashboard.
        </Text>
        <View style={styles.row}>
          <Button 
            title="IDR" 
            variant={settings.displayCurrency === 'IDR' ? 'primary' : 'outline'}
            onPress={() => handleToggleCurrency('IDR')}
            style={{ flex: 1, marginRight: 5 }}
          />
          <Button 
            title="EUR" 
            variant={settings.displayCurrency === 'EUR' ? 'primary' : 'outline'}
            onPress={() => handleToggleCurrency('EUR')}
            style={{ flex: 1, marginLeft: 5 }}
          />
        </View>
      </Card>

      <Card style={{ marginTop: 16 }}>
        <Text style={styles.sectionTitle}>Exchange Rate (EUR to IDR)</Text>
        <Text style={styles.description}>
          Set manual exchange rate. Example: 1 EUR = Rp. 20.000
        </Text>
        <Input
          label="Rate (Rp)"
          placeholder="e.g. 17000"
          value={tempRate}
          onChangeText={setTempRate}
          keyboardType="numeric"
          isCurrency={true}
        />
        <Button 
          title="Update Rate" 
          onPress={handleUpdateRate}
          style={{ marginTop: 10 }}
        />
      </Card>

      <Card style={{ marginTop: 16, borderColor: colors.danger, borderWidth: 1 }}>
        <Text style={[styles.sectionTitle, { color: colors.danger }]}>Danger Zone</Text>
        <Text style={styles.description}>
          Clear all transaction data for testing purposes.
        </Text>
        <Button 
          title="Reset All Transactions" 
          variant="danger"
          onPress={handleReset}
        />
      </Card>
      
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  description: {
    color: colors.textSecondary,
    fontSize: 14,
    marginBottom: 20,
    lineHeight: 20,
  },
  row: {
    flexDirection: 'row',
  },
});
