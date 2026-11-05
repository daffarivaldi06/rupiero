import { Platform, type TextStyle } from 'react-native';

// Fonts are embedded at build time by the expo-font config plugin (see app.json); on Android the
// family name is the file name. fontWeight is unreliable with custom fonts there, so each weight
// is its own family. On the web, FontGate.web.tsx registers the same files under the same names.
export const fontNames = {
  regular: 'IBMPlexSans_400Regular',
  medium: 'IBMPlexSans_500Medium',
  semibold: 'IBMPlexSans_600SemiBold',
  bold: 'IBMPlexSans_700Bold',
  mono: 'IBMPlexMono_500Medium',
} as const;

type FontRole = keyof typeof fontNames;

// On the web an unknown family falls back to the browser's serif default, so each one gets a generic
// fallback for the moment before the fonts load (or if they never do). Android keeps the bare names.
const webFallback: Record<FontRole, string> = {
  regular: 'sans-serif',
  medium: 'sans-serif',
  semibold: 'sans-serif',
  bold: 'sans-serif',
  mono: 'monospace',
};

export const fontFamily = Object.fromEntries(
  Object.entries(fontNames).map(([role, name]) => [
    role,
    Platform.OS === 'web' ? `${name}, ${webFallback[role as FontRole]}` : name,
  ]),
) as Record<FontRole, string>;

export type TextVariant = 'hero' | 'display' | 'title' | 'heading' | 'body' | 'bodyStrong' | 'label' | 'caption' | 'code';

export const textVariants: Record<TextVariant, TextStyle> = {
  /** Dashboard balances, the largest thing on screen. */
  hero: { fontFamily: fontFamily.bold, fontSize: 52, lineHeight: 62, letterSpacing: -0.5 },
  /** Big amounts. */
  display: { fontFamily: fontFamily.bold, fontSize: 40, lineHeight: 48 },
  title: { fontFamily: fontFamily.semibold, fontSize: 22, lineHeight: 28 },
  heading: { fontFamily: fontFamily.semibold, fontSize: 17, lineHeight: 24 },
  body: { fontFamily: fontFamily.regular, fontSize: 16, lineHeight: 22 },
  bodyStrong: { fontFamily: fontFamily.medium, fontSize: 16, lineHeight: 22 },
  label: { fontFamily: fontFamily.medium, fontSize: 13, lineHeight: 18 },
  caption: { fontFamily: fontFamily.regular, fontSize: 12, lineHeight: 16 },
  /** Currency codes (EUR, IDR). */
  code: { fontFamily: fontFamily.mono, fontSize: 12, lineHeight: 16, letterSpacing: 0.6 },
};

export type MoneySize = 'hero' | 'card' | 'row';

/** Amount sizes for wide layouts: medium-weight headline numbers, body-size amounts in tables. */
export const moneySizes: Record<MoneySize, TextStyle> = {
  /** Headline balances, e.g. the balance cards at the top of the dashboard. */
  hero: { fontFamily: fontFamily.medium, fontSize: 32, lineHeight: 40 },
  /** Amounts inside a card (cash flow, budgets). */
  card: { fontFamily: fontFamily.medium, fontSize: 20, lineHeight: 28 },
  /** Amounts in table and list rows. */
  row: { fontFamily: fontFamily.medium, fontSize: 15, lineHeight: 20 },
};
