// The Rupiero mark: a monogram "R" crossed by two bars like the € sign, stamped on a ledger rule.
// Plain geometry on a 100×100 grid (no font outlines), so it stays crisp at any size. This file is the
// single source for the in-app logo and for the generated icon/splash PNGs
// (scripts/render-brand-assets.ts), so keep it free of imports.

export interface MarkColors {
  /** Frame, letter and ledger rule. */
  ink: string;
  /** Upper bar. */
  eur: string;
  /** Lower bar. */
  idr: string;
}

/** Mark colours from a theme palette: the IDR bar uses the text variant so it holds up on `bg`. */
export const markColors = (palette: { ink: string; eur: string; idrText: string }): MarkColors => ({
  ink: palette.ink,
  eur: palette.eur,
  idr: palette.idrText,
});

export interface MarkSvgOptions {
  /** Fill behind the mark; transparent when omitted. */
  background?: string;
  /** Empty space around the mark as a fraction of the canvas side (0–0.5). */
  padding?: number;
}

export const MARK_VIEWBOX = 100;

const FRAME = { x: 9, y: 9, size: 82, radius: 7, stroke: 6 };
const STEM = { x: 36, width: 12, top: 25, bottom: 73 };
// Bowl as a stroked path: centre line from the stem to a half circle and back.
const BOWL = { stroke: 11, top: 30.5, bottom: 51.5, right: 60 };
const LEG = [
  [51, 49],
  [63, 49],
  [75, 73],
  [63, 73],
] as const;
const BARS = { left: 24, right: 48, height: 5, upper: 35.5, lower: 45.5 };
// Ledger rule the letter stands on, running into the frame on both sides.
const RULE = { y: 74.75, height: 3.5 };

const n = (value: number) => Number(value.toFixed(3)).toString();

/** The mark's shapes without the outer <svg>, on the 100×100 grid. */
export function markShapes({ ink, eur, idr }: MarkColors): string {
  const radius = (BOWL.bottom - BOWL.top) / 2;
  const stemCentre = STEM.x + STEM.width / 2;
  return [
    `<rect x="${FRAME.x}" y="${FRAME.y}" width="${FRAME.size}" height="${FRAME.size}" rx="${FRAME.radius}" ` +
      `fill="none" stroke="${ink}" stroke-width="${FRAME.stroke}"/>`,
    `<rect x="${STEM.x}" y="${STEM.top}" width="${STEM.width}" height="${STEM.bottom - STEM.top}" fill="${ink}"/>`,
    `<path d="M${n(stemCentre)} ${BOWL.top} H${BOWL.right} A${n(radius)} ${n(radius)} 0 0 1 ${BOWL.right} ${BOWL.bottom} ` +
      `H${n(stemCentre)}" fill="none" stroke="${ink}" stroke-width="${BOWL.stroke}"/>`,
    `<path d="M${LEG.map(([x, y]) => `${x} ${y}`).join(' L')} Z" fill="${ink}"/>`,
    `<rect x="${BARS.left}" y="${n(BARS.upper - BARS.height / 2)}" width="${BARS.right - BARS.left}" height="${BARS.height}" fill="${eur}"/>`,
    `<rect x="${BARS.left}" y="${n(BARS.lower - BARS.height / 2)}" width="${BARS.right - BARS.left}" height="${BARS.height}" fill="${idr}"/>`,
    `<rect x="${FRAME.x}" y="${n(RULE.y - RULE.height / 2)}" width="${FRAME.size}" height="${RULE.height}" fill="${ink}"/>`,
  ].join('');
}

/** A standalone square SVG document of the mark. */
export function buildMarkSvg(colors: MarkColors, { background, padding = 0 }: MarkSvgOptions = {}): string {
  if (padding < 0 || padding >= 0.5) throw new RangeError(`padding must be in [0, 0.5): ${padding}`);
  // Grow the viewBox around the 100×100 grid so the mark takes (1 − 2·padding) of the canvas.
  const side = MARK_VIEWBOX / (1 - 2 * padding);
  const offset = (side - MARK_VIEWBOX) / 2;
  const fill = background ? `<rect x="${n(-offset)}" y="${n(-offset)}" width="${n(side)}" height="${n(side)}" fill="${background}"/>` : '';
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${n(-offset)} ${n(-offset)} ${n(side)} ${n(side)}">` +
    fill +
    markShapes(colors) +
    '</svg>'
  );
}
