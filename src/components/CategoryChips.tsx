import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import type { Category } from '../domain/types';
import { useThemedStyles, type Theme } from '../theme/ThemeProvider';
import { Txt } from './Txt';
import { useI18n } from '../i18n/I18nProvider';

interface CategoryChipsProps {
  /** Most used first. */
  categories: Category[];
  selectedId: number | null;
  onSelect: (categoryId: number) => void;
}

const TOP = 8;

/** The most used categories as one-tap chips; "All…" reveals the rest. */
export const CategoryChips: React.FC<CategoryChipsProps> = ({ categories, selectedId, onSelect }) => {
  const styles = useThemedStyles(makeStyles);
  const { t } = useI18n();
  const [expanded, setExpanded] = useState(false);
  const selectedIndex = categories.findIndex((c) => c.id === selectedId);
  // Keep a selection from the long tail visible even when collapsed.
  const showAll = expanded || selectedIndex >= TOP;
  const visible = showAll ? categories : categories.slice(0, TOP);

  return (
    <View style={styles.wrap}>
      {visible.map((category) => {
        const selected = category.id === selectedId;
        return (
          <Pressable
            key={category.id}
            onPress={() => {
              Haptics.selectionAsync().catch(() => {});
              onSelect(category.id);
            }}
            style={[styles.chip, selected && styles.chipSelected]}
            hitSlop={4}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
          >
            <Txt variant="label" tone={selected ? 'onInk' : 'ink'} numberOfLines={1}>{category.name}</Txt>
          </Pressable>
        );
      })}
      {!showAll && categories.length > TOP && (
        <Pressable onPress={() => setExpanded(true)} style={[styles.chip, styles.more]} hitSlop={4} accessibilityRole="button">
          <Txt variant="label" tone="inkMuted">{t('common.allMore')}</Txt>
        </Pressable>
      )}
    </View>
  );
};

const makeStyles = ({ color, radius, space }: Theme) =>
  StyleSheet.create({
    wrap: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: space.sm,
    },
    chip: {
      minHeight: 40,
      justifyContent: 'center',
      paddingHorizontal: space.md,
      borderRadius: radius.sm,
      borderWidth: 1,
      borderColor: color.lineStrong,
    },
    chipSelected: {
      backgroundColor: color.ink,
      borderColor: color.ink,
    },
    more: {
      borderStyle: 'dashed',
    },
  });
