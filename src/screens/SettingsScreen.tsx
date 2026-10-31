import React, { useState, useCallback } from 'react';
import { View, StyleSheet, Alert, ScrollView, Pressable, Switch } from 'react-native';
import { useSQLiteContext } from '../db/DatabaseProvider';
import { useFocusEffect, useNavigation } from '@react-navigation/native';

import { SHOW_DEV_TOOLS } from '../config/dev';
import { pickBackupText, shareJsonBackup, shareLedgerCsv } from '../backup/files';
import { BackupError, importBackup, parseBackup } from '../db/backup';
import { getUserVersion } from '../db/client';
import { resetDatabase } from '../db/init';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Txt } from '../components/Txt';
import { useTheme, useThemedStyles, type Theme } from '../theme/ThemeProvider';
import type { RootNavigation } from '../navigation/types';
import { usePrivacy } from '../privacy/PrivacyProvider';

const LINKS = [
  { route: 'Accounts', title: 'Akun', description: 'Tambah, ganti nama, saldo awal, arsip' },
  { route: 'Categories', title: 'Kategori', description: 'Daftar kategori dan arsip' },
  { route: 'Budget', title: 'Budget', description: 'Batas pengeluaran per kategori per bulan' },
  { route: 'Recurring', title: 'Transaksi berulang', description: 'Harian, mingguan, bulanan, tahunan' },
  { route: 'Subscriptions', title: 'Langganan', description: 'Pengeluaran rutin dan totalnya per bulan' },
] as const;

export default function SettingsScreen() {
  const db = useSQLiteContext();
  const navigation = useNavigation<RootNavigation>();
  const styles = useThemedStyles(makeStyles);
  const { color } = useTheme();
  const privacy = usePrivacy();
  const [schemaVersion, setSchemaVersion] = useState<number>();

  useFocusEffect(
    useCallback(() => {
      (async () => {
        setSchemaVersion(await getUserVersion(db));
      })().catch(console.error);
    }, [db])
  );

  const run = async (action: () => Promise<void>, failure: string) => {
    try {
      await action();
    } catch (e) {
      console.error(e);
      Alert.alert('Gagal', failure);
    }
  };

  const handleImport = async () => {
    let text: string | null;
    try {
      text = await pickBackupText();
    } catch (e) {
      console.error(e);
      Alert.alert('Gagal', 'File tidak dapat dibaca');
      return;
    }
    if (text === null) return;
    try {
      const backup = parseBackup(text, await getUserVersion(db));
      const exportedOn = backup.exportedAt.slice(0, 10);
      Alert.alert(
        'Pulihkan dari backup?',
        `Semua data di perangkat ini diganti dengan backup ${exportedOn}: ${backup.accounts.length} akun, ` +
          `${backup.transactions.length} transaksi, ${backup.transfers.length} transfer. Pengaturan perangkat tetap.`,
        [
          { text: 'Batal', style: 'cancel' },
          {
            text: 'Pulihkan',
            style: 'destructive',
            onPress: async () => {
              try {
                await importBackup(db, backup);
                Alert.alert('Selesai', 'Data dipulihkan dari backup.');
              } catch (e) {
                Alert.alert('Backup ditolak', e instanceof BackupError ? e.message : 'Data tidak dapat dipulihkan');
              }
            },
          },
        ],
      );
    } catch (e) {
      Alert.alert('Backup ditolak', e instanceof BackupError ? e.message : 'File tidak dapat dibaca');
    }
  };

  const handleReset = (seed: boolean) => {
    Alert.alert(
      seed ? 'Reset & isi data contoh' : 'Reset ke kosong',
      'Semua data akan dihapus dan database dibuat ulang. Lanjutkan?',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            try {
              await resetDatabase(db, { seed });
              navigation.popToTop();
            } catch (e) {
              console.error(e);
              Alert.alert('Gagal', 'Database tidak dapat di-reset');
            }
          }
        }
      ]
    );
  };

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.list}>
        {LINKS.map((link) => (
          <Pressable key={link.route} onPress={() => navigation.navigate(link.route)} style={styles.row} accessibilityRole="button">
            <View style={styles.rowText}>
              <Txt variant="bodyStrong">{link.title}</Txt>
              <Txt variant="caption" tone="inkMuted">{link.description}</Txt>
            </View>
            <Txt tone="inkMuted">›</Txt>
          </Pressable>
        ))}
      </View>

      <Txt variant="label" tone="inkMuted" style={styles.sectionLabel}>Privasi</Txt>
      <View style={styles.list}>
        <View style={styles.row}>
          <View style={styles.rowText}>
            <Txt variant="bodyStrong">Sembunyikan saldo</Txt>
            <Txt variant="caption" tone="inkMuted">Nominal tampil sebagai € •••• / Rp ••••. Juga lewat ikon mata di Dashboard.</Txt>
          </View>
          <Switch
            value={privacy.hidden}
            onValueChange={privacy.toggleHidden}
            trackColor={{ false: color.line, true: color.ink }}
            thumbColor={color.surface}
            accessibilityLabel="Sembunyikan saldo"
          />
        </View>
        <View style={styles.row}>
          <View style={styles.rowText}>
            <Txt variant="bodyStrong">Ikut sembunyikan di widget</Txt>
            <Txt variant="caption" tone="inkMuted">Widget layar utama ikut tersamarkan selama saldo disembunyikan.</Txt>
          </View>
          <Switch
            value={privacy.hideInWidget}
            onValueChange={privacy.setHideInWidget}
            trackColor={{ false: color.line, true: color.ink }}
            thumbColor={color.surface}
            accessibilityLabel="Ikut sembunyikan di widget"
          />
        </View>
      </View>

      <Txt variant="label" tone="inkMuted" style={styles.sectionLabel}>Data</Txt>
      <View style={styles.list}>
        {[
          { title: 'Ekspor backup (JSON)', description: 'Semua akun, transaksi, transfer, budget dan aturan berulang', onPress: () => run(() => shareJsonBackup(db), 'Backup tidak dapat dibuat') },
          { title: 'Ekspor transaksi (CSV)', description: 'Untuk spreadsheet; jumlah memakai titik desimal', onPress: () => run(() => shareLedgerCsv(db), 'CSV tidak dapat dibuat') },
          { title: 'Pulihkan dari backup', description: 'Ganti semua data dengan file backup JSON', onPress: handleImport },
        ].map((item) => (
          <Pressable key={item.title} onPress={item.onPress} style={styles.row} accessibilityRole="button">
            <View style={styles.rowText}>
              <Txt variant="bodyStrong">{item.title}</Txt>
              <Txt variant="caption" tone="inkMuted">{item.description}</Txt>
            </View>
            <Txt tone="inkMuted">›</Txt>
          </Pressable>
        ))}
      </View>

      {SHOW_DEV_TOOLS && (
        <Card style={styles.devCard}>
          <Txt variant="heading" tone="expense">Alat Pengembang</Txt>
          <Txt variant="caption" tone="inkMuted" style={styles.devDescription}>
            Hanya tampil di build development. Skema database: v{schemaVersion ?? '?'}
          </Txt>
          <Button title="Reset & isi data contoh" variant="danger" onPress={() => handleReset(true)} />
          <Button title="Reset ke kosong" variant="outline" onPress={() => handleReset(false)} />
        </Card>
      )}
    </ScrollView>
  );
}

const makeStyles = ({ color, space }: Theme) =>
  StyleSheet.create({
    content: {
      padding: space.lg,
      paddingBottom: space.xxl,
    },
    list: {
      borderTopWidth: 1,
      borderTopColor: color.ink,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: 56,
      paddingVertical: space.sm,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: color.line,
    },
    rowText: {
      flex: 1,
      marginRight: space.md,
    },
    sectionLabel: {
      marginTop: space.xl,
      marginBottom: space.xs,
    },
    devCard: {
      marginTop: space.xxl,
      borderColor: color.expense,
      borderWidth: 1,
    },
    devDescription: {
      marginTop: space.xs,
      marginBottom: space.sm,
    },
  });
