// "Buku Kas" design tokens. Colour means something (currency, income, expense); it is never decoration.
// Text-on-background pairs are checked against WCAG AA in __tests__/contrast.test.ts.

export type ColorScheme = 'light' | 'dark';

export interface Palette {
  bg: string;
  surface: string;
  ink: string;
  inkMuted: string;
  /** Hairline rules between ledger rows. Decorative, intentionally low contrast. */
  line: string;
  /** Borders of interactive controls (inputs, chips); ≥ 3:1. */
  lineStrong: string;
  eur: string;
  /** IDR fills and marks; put `onIdr` text on top of it. */
  idr: string;
  /** IDR as text on bg/surface. */
  idrText: string;
  expense: string;
  /** Income fills, and income text on surface. */
  income: string;
  /** Income as text on bg. */
  incomeText: string;
  /** Text on an `ink` fill (primary buttons, selected chips). */
  onInk: string;
  onExpense: string;
  onIncome: string;
  onIdr: string;
}

export const palettes: Record<ColorScheme, Palette> = {
  light: {
    bg: '#F4F1EA',
    surface: '#FBFAF6',
    ink: '#1C1B19',
    inkMuted: '#5F5B53',
    line: '#D9D4C7',
    lineStrong: '#857E70',
    eur: '#2E4A8B',
    idr: '#C98A0B',
    idrText: '#8A5D00',
    expense: '#B23A2E',
    income: '#2F7D4F',
    incomeText: '#2A7047',
    onInk: '#F4F1EA',
    onExpense: '#FFFFFF',
    onIncome: '#FFFFFF',
    onIdr: '#1C1B19',
  },
  dark: {
    bg: '#16181D',
    surface: '#1F232A',
    ink: '#ECE8DF',
    inkMuted: '#A39E93',
    line: '#323843',
    lineStrong: '#6B7380',
    eur: '#9DB2EA',
    idr: '#E0A93A',
    idrText: '#E0A93A',
    expense: '#E8877B',
    income: '#6FC08F',
    incomeText: '#6FC08F',
    onInk: '#16181D',
    onExpense: '#16181D',
    onIncome: '#16181D',
    onIdr: '#16181D',
  },
};

export const radius = {
  /** Inputs, chips, buttons. */
  sm: 4,
  /** Cards, sheets. */
  md: 8,
} as const;

export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

/** Wide web layouts (ADR 0001). The phone and tablet text column is MAX_CONTENT_WIDTH in layout.ts. */
export const layout = {
  /** The main content area stops growing here; the rest becomes margin. */
  contentMaxWidth: 1200,
  /** The permanent sidebar. */
  sidebarWidth: 240,
} as const;
