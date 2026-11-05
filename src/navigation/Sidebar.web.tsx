import React from 'react';
import { Pressable, StyleSheet, View, type PressableStateCallbackType } from 'react-native';
import type { DrawerContentComponentProps } from '@react-navigation/drawer';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Wordmark } from '../brand/Wordmark';
import { Txt } from '../components/Txt';
import { useI18n } from '../i18n/I18nProvider';
import { useThemedStyles, type Theme } from '../theme/ThemeProvider';
import { activeSection, MAIN_SECTIONS, SETTINGS_SECTION, type Section, type SectionItem } from './sections';

/** react-native-web adds `hovered` to Pressable's state. */
type PressState = PressableStateCallbackType & { hovered?: boolean };

/**
 * The permanent sidebar on wide web screens: wordmark, the main sections, Settings at the bottom.
 * The highlighted item is the section the current stack screen belongs to.
 */
export function Sidebar({ state, navigation }: DrawerContentComponentProps) {
  const styles = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const main = state.routes[state.index];
  const active = activeSection(main.state?.routes.map((route) => route.name) ?? []);

  // Back to the section if it is already in the stack (browser back then returns to where you were),
  // otherwise on top of it.
  const open = (route: Section) => navigation.navigate('Main', { screen: route, pop: true });

  const item = (section: SectionItem) => (
    <SidebarItem key={section.route} section={section} active={section.route === active} onPress={() => open(section.route)} />
  );

  return (
    <View style={[styles.sidebar, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 16 }]} role="navigation">
      <View style={styles.brand}>
        <Wordmark />
      </View>
      <View style={styles.items}>{MAIN_SECTIONS.map(item)}</View>
      <View style={styles.bottom}>{item(SETTINGS_SECTION)}</View>
    </View>
  );
}

function SidebarItem({ section, active, onPress }: { section: SectionItem; active: boolean; onPress: () => void }) {
  const styles = useThemedStyles(makeStyles);
  const { t } = useI18n();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="link"
      accessibilityState={{ selected: active }}
      style={({ hovered, pressed }: PressState) => [styles.item, !active && (hovered || pressed) && styles.itemHover, active && styles.itemActive]}
    >
      <Txt variant={active ? 'bodyStrong' : 'body'} tone={active ? 'onInk' : 'ink'}>
        {t(section.label)}
      </Txt>
    </Pressable>
  );
}

const makeStyles = ({ color, radius, space }: Theme) =>
  StyleSheet.create({
    // The drawer draws the hairline on the right edge.
    sidebar: {
      flex: 1,
      paddingHorizontal: space.md,
      backgroundColor: color.bg,
    },
    brand: {
      paddingHorizontal: space.sm,
      marginBottom: space.xl,
    },
    items: {
      gap: space.xs,
    },
    bottom: {
      marginTop: 'auto',
    },
    item: {
      minHeight: 44,
      justifyContent: 'center',
      paddingHorizontal: space.md,
      borderRadius: radius.sm,
      cursor: 'pointer',
    },
    itemHover: {
      backgroundColor: color.line,
    },
    itemActive: {
      backgroundColor: color.ink,
    },
  });
