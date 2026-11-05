import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useI18n } from '../i18n/I18nProvider';
import { useThemedStyles, type Theme } from '../theme/ThemeProvider';
import type { QuickAddModalProps } from './QuickAddModal.types';
import { isTextField } from './textField';

/** Width of the dialog on wide screens. */
const WIDTH = 460;

/**
 * Wide web screens (ADR 0001): quick-add as a centered dialog instead of the bottom sheet, a phone
 * pattern. A click on the backdrop or Esc closes it.
 */
export function QuickAddModal({ visible, onClose, contentContainerStyle, children }: QuickAddModalProps) {
  const styles = useThemedStyles(makeStyles);
  const { t } = useI18n();
  // react-native-web closes a Modal on any Escape keyup in the document. Escape while typing the
  // note stays the note's, as in the bottom sheet (useKeyboardKeypad).
  const requestClose = () => {
    if (!isTextField(document.activeElement)) onClose();
  };
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={requestClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityRole="button" accessibilityLabel={t('common.close')} />
        <View style={styles.card} role="dialog" aria-modal>
          <ScrollView contentContainerStyle={contentContainerStyle} keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const makeStyles = ({ color, radius }: Theme) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: color.ink,
      opacity: 0.4,
      cursor: 'auto',
    },
    card: {
      width: WIDTH,
      maxWidth: '92%',
      maxHeight: '90%',
      backgroundColor: color.surface,
      borderRadius: radius.md,
      overflow: 'hidden',
    },
  });
