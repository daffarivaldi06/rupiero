import type { TextStyle } from 'react-native';

// Fonts are embedded at build time by the expo-font config plugin (see app.json); on Android the
// family name is the file name. fontWeight is unreliable with custom fonts there, so each weight
// is its own family.
export const fontFamily = {
  regular: 'IBMPlexSans_400Regular',
  medium: 'IBMPlexSans_500Medium',
  semibold: 'IBMPlexSans_600SemiBold',
  bold: 'IBMPlexSans_700Bold',
  mono: 'IBMPlexMono_500Medium',
} as const;

export type TextVariant = 'display' | 'title' | 'heading' | 'body' | 'bodyStrong' | 'label' | 'caption' | 'code';

export const textVariants: Record<TextVariant, TextStyle> = {
  /** Big balances. */
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
