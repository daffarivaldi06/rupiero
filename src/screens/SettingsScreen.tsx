import React, { useState, useCallback } from 'react';
import { View, StyleSheet, Alert, ScrollView, Pressable, Switch, Platform } from 'react-native';
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
import { useReadableInset } from '../theme/layout';
import { space } from '../theme/tokens';
import type { RootNavigation } from '../navigation/types';
import { usePrivacy } from '../privacy/PrivacyProvider';
import { getBaseCurrency, getThemePreference, setBaseCurrency, setThemePreference } from '../db/repos/settings';
import type { CurrencyCode } from '../domain/money';
import { applyThemePreference, THEME_PREFERENCES, type ThemePreference } from '../theme/themePreference';
import { useI18n } from '../i18n/I18nProvider';
import { useToast } from '../feedback/ToastProvider';
import { LANGUAGE_PREFERENCES, resolveLocale, type LanguagePreference } from '../i18n/locale';
import { systemLanguageCodes } from '../i18n/system';
import type { MessageKey } from '../i18n';

const LINKS = [
  { route: 'Accounts', key: 'accounts' },
  { route: 'Categories', key: 'categories' },
  { route: 'Budget', key: 'budget' },
  { route: 'Recurring', key: 'recurring' },
  { route: 'Subscriptions', key: 'subscriptions' },
] as const;

const THEME_LABEL: Record<ThemePreference, MessageKey> = {
  system: 'settings.themeSystem',
  light: 'settings.themeLight',
  dark: 'settings.themeDark',
};

const BASE_CURRENCY_LABEL: Record<CurrencyCode, MessageKey> = {
  EUR: 'settings.baseCurrencyEur',
  IDR: 'settings.baseCurrencyIdr',
};
const BASE_CURRENCIES = Object.keys(BASE_CURRENCY_LABEL) as CurrencyCode[];

/** Each language is named in itself, so it can be found whatever the current language is. */
const LANGUAGE_LABEL: Record<LanguagePreference, MessageKey> = {
  system: 'settings.languageSystem',
  id: 'settings.languageId',
  en: 'settings.languageEn',
};

export default function SettingsScreen() {
  const db = useSQLiteContext();
  const navigation = useNavigation<RootNavigation>();
  const styles = useThemedStyles(makeStyles);
  const inset = useReadableInset(space.lg);
  const { color } = useTheme();
  const privacy = usePrivacy();
  const { t, preference, setPreference } = useI18n();
  const toast = useToast();
  const systemLocale = resolveLocale('system', systemLanguageCodes());
  const [schemaVersion, setSchemaVersion] = useState<number>();
  const [theme, setTheme] = useState<ThemePreference>('system');
  // Web only for now: the base-currency choice and the Dashboard total it drives (ADR 0001).
  const [baseCurrency, setBase] = useState<CurrencyCode>('EUR');

  useFocusEffect(
    useCallback(() => {
      (async () => {
        setSchemaVersion(await getUserVersion(db));
        setTheme(await getThemePreference(db));
        if (Platform.OS === 'web') setBase(await getBaseCurrency(db));
      })().catch(console.error);
    }, [db])
  );

  const run = async (action: () => Promise<void>, failure: string) => {
    try {
      await action();
    } catch (e) {
      console.error(e);
      toast.show(failure, { tone: 'error' });
    }
  };

  const changeTheme = (next: ThemePreference) => {
    setTheme(next);
    applyThemePreference(next);
    setThemePreference(db, next).catch(console.error);
  };

  const changeBaseCurrency = (next: CurrencyCode) => {
    setBase(next);
    setBaseCurrency(db, next).catch(console.error);
  };

  const handleImport = async () => {
    let text: string | null;
    try {
      text = await pickBackupText();
    } catch (e) {
      console.error(e);
      toast.show(t('settings.fileUnreadable'), { tone: 'error' });
      return;
    }
    if (text === null) return;
    try {
      const backup = parseBackup(text, await getUserVersion(db));
      const exportedOn = backup.exportedAt.slice(0, 10);
      Alert.alert(
        t('settings.restoreTitle'),
        t('settings.restoreMessage', {
          date: exportedOn,
          accounts: backup.accounts.length,
          transactions: backup.transactions.length,
          transfers: backup.transfers.length,
        }),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('settings.restore'),
            style: 'destructive',
            onPress: async () => {
              try {
                await importBackup(db, backup);
                toast.show(t('settings.restoreDone'));
              } catch (e) {
                Alert.alert(t('settings.backupRejected'), e instanceof BackupError ? e.message : t('settings.restoreFailed'));
              }
            },
          },
        ],
      );
    } catch (e) {
      Alert.alert(t('settings.backupRejected'), e instanceof BackupError ? e.message : t('settings.fileUnreadable'));
    }
  };

  const handleReset = (seed: boolean) => {
    Alert.alert(
      t(seed ? 'settings.resetSample' : 'settings.resetEmpty'),
      t('settings.resetMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('settings.reset'),
          style: 'destructive',
          onPress: async () => {
            try {
              await resetDatabase(db, { seed });
              navigation.popToTop();
            } catch (e) {
              console.error(e);
              toast.show(t('settings.resetFailed'), { tone: 'error' });
            }
          }
        }
      ]
    );
  };

  return (
    <ScrollView contentContainerStyle={[styles.content, { paddingHorizontal: inset }]}>
      <View style={styles.list}>
        {LINKS.map((link) => (
          <Pressable key={link.route} onPress={() => navigation.navigate(link.route)} style={styles.row} accessibilityRole="button">
            <View style={styles.rowText}>
              <Txt variant="bodyStrong">{t(`settings.links.${link.key}.title`)}</Txt>
              <Txt variant="caption" tone="inkMuted">{t(`settings.links.${link.key}.description`)}</Txt>
            </View>
            <Txt tone="inkMuted">›</Txt>
          </Pressable>
        ))}
      </View>

      <Txt variant="label" tone="inkMuted" style={styles.sectionLabel}>{t('settings.language')}</Txt>
      <View style={styles.list} accessibilityRole="radiogroup">
        {LANGUAGE_PREFERENCES.map((option) => (
          <RadioRow
            key={option}
            label={t(LANGUAGE_LABEL[option])}
            hint={option === 'system' && preference === 'system' ? t('settings.languageSystemHint', { language: t(LANGUAGE_LABEL[systemLocale]) }) : undefined}
            selected={preference === option}
            onPress={() => setPreference(option)}
          />
        ))}
      </View>

      <Txt variant="label" tone="inkMuted" style={styles.sectionLabel}>{t('settings.theme')}</Txt>
      <View style={styles.list} accessibilityRole="radiogroup">
        {THEME_PREFERENCES.map((option) => (
          <RadioRow key={option} label={t(THEME_LABEL[option])} selected={theme === option} onPress={() => changeTheme(option)} />
        ))}
      </View>

      {Platform.OS === 'web' && (
        <>
          <Txt variant="label" tone="inkMuted" style={styles.sectionLabel}>{t('settings.baseCurrency')}</Txt>
          <View style={styles.list} accessibilityRole="radiogroup">
            {BASE_CURRENCIES.map((option) => (
              <RadioRow
                key={option}
                label={t(BASE_CURRENCY_LABEL[option])}
                selected={baseCurrency === option}
                onPress={() => changeBaseCurrency(option)}
              />
            ))}
          </View>
        </>
      )}

      <Txt variant="label" tone="inkMuted" style={styles.sectionLabel}>{t('settings.privacy')}</Txt>
      <View style={styles.list}>
        <View style={styles.row}>
          <View style={styles.rowText}>
            <Txt variant="bodyStrong">{t('header.hideBalances')}</Txt>
            <Txt variant="caption" tone="inkMuted">{t('settings.hideBalancesHint')}</Txt>
          </View>
          <Switch
            value={privacy.hidden}
            onValueChange={privacy.toggleHidden}
            trackColor={{ false: color.line, true: color.ink }}
            thumbColor={color.surface}
            accessibilityLabel={t('header.hideBalances')}
          />
        </View>
        {/* There is no home-screen widget on the web. */}
        {Platform.OS !== 'web' && (
          <View style={styles.row}>
            <View style={styles.rowText}>
              <Txt variant="bodyStrong">{t('settings.hideInWidget')}</Txt>
              <Txt variant="caption" tone="inkMuted">{t('settings.hideInWidgetHint')}</Txt>
            </View>
            <Switch
              value={privacy.hideInWidget}
              onValueChange={privacy.setHideInWidget}
              trackColor={{ false: color.line, true: color.ink }}
              thumbColor={color.surface}
              accessibilityLabel={t('settings.hideInWidget')}
            />
          </View>
        )}
      </View>

      {/* Backup, import and CSV export use expo-file-system, which has no web implementation. */}
      {Platform.OS !== 'web' && (
        <>
          <Txt variant="label" tone="inkMuted" style={styles.sectionLabel}>{t('settings.data')}</Txt>
          <View style={styles.list}>
            {[
              { title: t('settings.exportJson'), description: t('settings.exportJsonHint'), onPress: () => run(() => shareJsonBackup(db), t('settings.exportJsonFailed')) },
              { title: t('settings.exportCsv'), description: t('settings.exportCsvHint'), onPress: () => run(() => shareLedgerCsv(db), t('settings.exportCsvFailed')) },
              { title: t('settings.importJson'), description: t('settings.importJsonHint'), onPress: handleImport },
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
        </>
      )}

      {SHOW_DEV_TOOLS && (
        <Card style={styles.devCard}>
          <Txt variant="heading" tone="expense">{t('settings.devTools')}</Txt>
          <Txt variant="caption" tone="inkMuted" style={styles.devDescription}>
            {t('settings.devToolsHint', { version: schemaVersion ?? '?' })}
          </Txt>
          <Button title={t('settings.resetSample')} variant="danger" onPress={() => handleReset(true)} />
          <Button title={t('settings.resetEmpty')} variant="outline" onPress={() => handleReset(false)} />
        </Card>
      )}
    </ScrollView>
  );
}

function RadioRow({ label, hint, selected, onPress }: { label: string; hint?: string; selected: boolean; onPress: () => void }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <Pressable onPress={onPress} style={styles.row} accessibilityRole="radio" accessibilityState={{ selected }}>
      <View style={styles.rowText}>
        <Txt variant="bodyStrong">{label}</Txt>
        {hint !== undefined && <Txt variant="caption" tone="inkMuted">{hint}</Txt>}
      </View>
      <View style={[styles.radio, selected && styles.radioSelected]}>{selected && <View style={styles.radioDot} />}</View>
    </Pressable>
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
    radio: {
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 2,
      borderColor: color.lineStrong,
      alignItems: 'center',
      justifyContent: 'center',
    },
    radioSelected: {
      borderColor: color.ink,
    },
    radioDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: color.ink,
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
