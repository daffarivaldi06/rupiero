// Renders the app icon, adaptive icon and splash PNGs from src/brand/mark.ts.
// Run after changing the mark or the palette: `npm run brand:assets` (Node ≥ 22.18 strips the types).
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';
import { buildMarkSvg, markColors, type MarkSvgOptions } from '../src/brand/mark.ts';
import { palettes } from '../src/theme/tokens.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const light = markColors(palettes.light);
const dark = markColors(palettes.dark);
const black = { ink: '#000000', eur: '#000000', idr: '#000000' };

// Adaptive icons keep a safe circle of 66/108 of the canvas; the splash icon (Android 12+) is masked
// to a circle of 2/3. The adaptive mark is drawn ~24% bigger than the splash one with rounder frame
// corners, which keeps the corners on the safe circle (radius 0.305 of the canvas).
const ADAPTIVE = { padding: 0.215, frameRadius: 18 };
const SPLASH_PADDING = 0.27;

const outputs: { file: string; colors: typeof light; size: number; options: MarkSvgOptions }[] = [
  { file: 'icon.png', colors: light, size: 1024, options: { background: palettes.light.bg, padding: 0.14 } },
  { file: 'favicon.png', colors: light, size: 48, options: { background: palettes.light.bg, padding: 0.04 } },
  { file: 'adaptive-icon.png', colors: light, size: 1024, options: ADAPTIVE },
  { file: 'adaptive-icon-monochrome.png', colors: black, size: 1024, options: ADAPTIVE },
  { file: 'splash-icon.png', colors: light, size: 1024, options: { padding: SPLASH_PADDING } },
  { file: 'splash-icon-dark.png', colors: dark, size: 1024, options: { padding: SPLASH_PADDING } },
];

for (const { file, colors, size, options } of outputs) {
  const svg = buildMarkSvg(colors, options);
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: size } }).render().asPng();
  writeFileSync(join(root, 'assets', file), png);
  console.log(`assets/${file} (${size}px)`);
}

mkdirSync(join(root, 'assets/brand'), { recursive: true });
writeFileSync(join(root, 'assets/brand/rupiero-mark-light.svg'), buildMarkSvg(light) + '\n');
writeFileSync(join(root, 'assets/brand/rupiero-mark-dark.svg'), buildMarkSvg(dark) + '\n');
console.log('assets/brand/rupiero-mark-{light,dark}.svg');
