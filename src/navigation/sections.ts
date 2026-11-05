import type { MessageKey } from '../i18n';
import type { RootStackParamList } from './types';

/** The stack screens that are sidebar sections (web, wide screens). */
export type Section = Extract<keyof RootStackParamList, 'Dashboard' | 'Transactions' | 'Budget' | 'Insights' | 'Settings'>;

export interface SectionItem {
  route: Section;
  label: MessageKey;
}

/** Sidebar order, top to bottom. */
export const MAIN_SECTIONS: readonly SectionItem[] = [
  { route: 'Dashboard', label: 'nav.dashboard' },
  { route: 'Transactions', label: 'nav.transactions' },
  { route: 'Budget', label: 'nav.budget' },
  { route: 'Insights', label: 'nav.insights' },
];

/** Pinned at the bottom of the sidebar. */
export const SETTINGS_SECTION: SectionItem = { route: 'Settings', label: 'nav.settings' };

const SECTION_ROUTES = new Set<string>([...MAIN_SECTIONS, SETTINGS_SECTION].map((s) => s.route));

/**
 * The section to highlight for a stack (route names, bottom to top): the topmost section, so a
 * detail screen keeps the section it was opened from. The Dashboard when there is none.
 */
export function activeSection(stackRoutes: readonly string[]): Section {
  for (let i = stackRoutes.length - 1; i >= 0; i--) {
    if (SECTION_ROUTES.has(stackRoutes[i])) return stackRoutes[i] as Section;
  }
  return 'Dashboard';
}
