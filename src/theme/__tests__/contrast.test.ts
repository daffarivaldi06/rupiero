import { palettes, type ColorScheme, type Palette } from '../tokens';

// WCAG 2.x relative luminance and contrast ratio.
function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const v = parseInt(hex.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const TEXT_ON_BACKGROUNDS: (keyof Palette)[] = ['ink', 'inkMuted', 'eur', 'idrText', 'expense', 'incomeText'];
const BACKGROUNDS: (keyof Palette)[] = ['bg', 'surface'];
// [text, fill] pairs used for buttons, chips and badges.
const TEXT_ON_FILLS: [keyof Palette, keyof Palette][] = [
  ['onInk', 'ink'],
  ['onExpense', 'expense'],
  ['onIncome', 'income'],
  ['onIdr', 'idr'],
  ['income', 'surface'],
];

describe.each(Object.keys(palettes) as ColorScheme[])('%s palette', (scheme) => {
  const p = palettes[scheme];

  it.each(TEXT_ON_BACKGROUNDS.flatMap((text) => BACKGROUNDS.map((bg) => [text, bg] as const)))(
    '%s on %s meets AA (4.5:1)',
    (text, bg) => {
      expect(contrast(p[text], p[bg])).toBeGreaterThanOrEqual(4.5);
    },
  );

  it.each(TEXT_ON_FILLS)('%s on %s meets AA (4.5:1)', (text, fill) => {
    expect(contrast(p[text], p[fill])).toBeGreaterThanOrEqual(4.5);
  });

  it.each(BACKGROUNDS)('lineStrong on %s meets the 3:1 non-text minimum', (bg) => {
    expect(contrast(p.lineStrong, p[bg])).toBeGreaterThanOrEqual(3);
  });
});

it('matches known WCAG reference values', () => {
  expect(contrast('#000000', '#FFFFFF')).toBeCloseTo(21, 5);
  expect(contrast('#FFFFFF', '#FFFFFF')).toBeCloseTo(1, 5);
});
