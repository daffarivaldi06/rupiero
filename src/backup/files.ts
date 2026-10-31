import { File, Paths } from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import { exportBackup } from '../db/backup';
import type { Db } from '../db/client';
import { exportLedgerCsv } from '../db/csv';
import { todayLocal } from '../domain/dates';
import { t } from '../i18n';

async function shareText(name: string, text: string, mimeType: string): Promise<void> {
  const file = new File(Paths.cache, name);
  if (file.exists) file.delete();
  file.create();
  file.write(text);
  await Sharing.shareAsync(file.uri, { mimeType, dialogTitle: name });
}

/** Writes a full JSON backup to the cache and opens the share sheet (Drive, e-mail, Files…). */
export async function shareJsonBackup(db: Db): Promise<void> {
  const backup = await exportBackup(db);
  await shareText(`rupiero-backup-${todayLocal()}.json`, JSON.stringify(backup, null, 2), 'application/json');
}

export async function shareLedgerCsv(db: Db): Promise<void> {
  await shareText(`rupiero-${t('csv.fileName')}-${todayLocal()}.csv`, await exportLedgerCsv(db), 'text/csv');
}

/** Lets the user pick a backup file; null if cancelled. */
export async function pickBackupText(): Promise<string | null> {
  const result = await DocumentPicker.getDocumentAsync({ type: ['application/json', 'text/plain', '*/*'], copyToCacheDirectory: true });
  if (result.canceled || result.assets.length === 0) return null;
  return new File(result.assets[0].uri).text();
}
