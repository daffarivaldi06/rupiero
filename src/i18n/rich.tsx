import React from 'react';
import { splitMessage, type MessageKey } from './index';
import type { Locale } from './locale';

/**
 * A message with components in its {placeholders}, e.g. renderMessage('budgetBar.of', { spent: <Money … /> })
 * inside a <Txt>. Word order stays the translation's.
 */
export function renderMessage(key: MessageKey, slots: Record<string, React.ReactNode>, locale?: Locale): React.ReactNode[] {
  return splitMessage(key, locale).map((part, index) =>
    index % 2 === 0 ? part : <React.Fragment key={index}>{slots[part]}</React.Fragment>,
  );
}
