// The Android date picker is themed in app.json (native config, no JS at runtime). Keep it on the
// Buku Kas tokens so a palette change cannot leave the picker behind in the old colours.
import appJson from '../../../app.json';
import { palettes, type Palette } from '../tokens';

type Plugin = string | [string, { android?: { datePicker?: Record<string, { light: string; dark: string }> } }];

const EXPECTED: Record<string, keyof Palette> = {
  colorAccent: 'ink',
  colorControlActivated: 'ink',
  colorControlHighlight: 'line',
  windowBackground: 'surface',
  textColorPrimary: 'ink',
  textColorSecondary: 'inkMuted',
  textColorPrimaryInverse: 'onInk',
  textColorSecondaryInverse: 'onInk',
};

it('uses the theme tokens in light and dark', () => {
  const plugin = (appJson.expo.plugins as Plugin[]).find(
    (p): p is Exclude<Plugin, string> => Array.isArray(p) && p[0] === '@react-native-community/datetimepicker',
  );
  const colors = plugin?.[1].android?.datePicker ?? {};
  expect(Object.keys(colors).sort()).toEqual(Object.keys(EXPECTED).sort());
  for (const [attr, token] of Object.entries(EXPECTED)) {
    expect({ attr, ...colors[attr] }).toEqual({ attr, light: palettes.light[token], dark: palettes.dark[token] });
  }
});
