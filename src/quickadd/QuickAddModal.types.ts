import type React from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

/** Quick-add as a centered dialog on wide web screens (QuickAddModal.web.tsx). */
export interface QuickAddModalProps {
  visible: boolean;
  /** Esc, a click on the backdrop. */
  onClose: () => void;
  contentContainerStyle?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}
