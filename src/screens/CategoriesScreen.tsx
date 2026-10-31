import React, { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSQLiteContext } from '../db/DatabaseProvider';
import { useFocusEffect, useNavigation } from '@react-navigation/native';

import { listArchivedCategories, listCategories, setCategoryArchived } from '../db/repos/categories';
import { currentMonth } from '../domain/dates';
import type { Category } from '../domain/types';
import { Txt } from '../components/Txt';
import type { RootNavigation } from '../navigation/types';
import { useThemedStyles, type Theme } from '../theme/ThemeProvider';
import { useI18n } from '../i18n/I18nProvider';

/** Active categories, plus the archive where hidden ones can be brought back. */
export default function CategoriesScreen() {
  const db = useSQLiteContext();
  const navigation = useNavigation<RootNavigation>();
  const styles = useThemedStyles(makeStyles);
  const { t } = useI18n();
  const [active, setActive] = useState<Category[]>([]);
  const [archived, setArchived] = useState<Category[]>([]);

  const load = useCallback(async () => {
    try {
      const [nextActive, nextArchived] = await Promise.all([listCategories(db), listArchivedCategories(db)]);
      setActive(nextActive);
      setArchived(nextArchived);
    } catch (e) {
      console.error(e);
    }
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const restore = async (category: Category) => {
    try {
      await setCategoryArchived(db, category.id, false);
      await load();
    } catch (e) {
      console.error(e);
      Alert.alert(t('common.failed'), t('categories.restoreFailed'));
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.list}>
        {active.map((category) => (
          <Pressable
            key={category.id}
            onPress={() => navigation.navigate('CategoryDetail', { categoryId: category.id, month: currentMonth() })}
            style={styles.row}
            accessibilityRole="button"
          >
            <Txt style={styles.rowText} numberOfLines={1}>{category.name}</Txt>
            <Txt tone="inkMuted">›</Txt>
          </Pressable>
        ))}
        <Pressable onPress={() => navigation.navigate('CategoryForm')} style={styles.row} accessibilityRole="button">
          <Txt variant="bodyStrong">{t('categories.add')}</Txt>
        </Pressable>
      </View>

      <Txt variant="label" tone="inkMuted" style={styles.sectionLabel}>{t('categories.archive')}</Txt>
      {archived.length === 0 ? (
        <Txt tone="inkMuted">{t('categories.archiveEmpty')}</Txt>
      ) : (
        <View style={styles.list}>
          {archived.map((category) => (
            <View key={category.id} style={styles.row}>
              <Txt tone="inkMuted" style={styles.rowText} numberOfLines={1}>{category.name}</Txt>
              <Pressable
                onPress={() => restore(category)}
                style={styles.restore}
                accessibilityRole="button"
                accessibilityLabel={t('categories.restoreName', { name: category.name })}
              >
                <Txt variant="bodyStrong">{t('common.restore')}</Txt>
              </Pressable>
            </View>
          ))}
        </View>
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
    sectionLabel: {
      marginTop: space.xl,
      marginBottom: space.xs,
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
      marginRight: space.md,
    },
    restore: {
      minHeight: 44,
      justifyContent: 'center',
      paddingLeft: space.md,
    },
  });
