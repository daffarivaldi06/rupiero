import React from 'react';
import Svg, { Circle, Path } from 'react-native-svg';

const TEETH = 8;
const OUTER = 10;
const INNER = 7.4;

// Gear outline on a 24×24 grid: each tooth is a trapezoid between the inner and outer radius.
const GEAR_PATH = (() => {
  const period = (2 * Math.PI) / TEETH;
  const point = (r: number, angle: number) =>
    `${(12 + r * Math.cos(angle)).toFixed(2)} ${(12 + r * Math.sin(angle)).toFixed(2)}`;
  const points: string[] = [];
  for (let k = 0; k < TEETH; k++) {
    const centre = k * period;
    points.push(
      point(INNER, centre - period * 0.32),
      point(OUTER, centre - period * 0.18),
      point(OUTER, centre + period * 0.18),
      point(INNER, centre + period * 0.32),
    );
  }
  return `M${points.join(' L')} Z`;
})();

interface SettingsIconProps {
  size?: number;
  color: string;
}

/** Line gear in the ledger style (no icon font, so nothing to load). */
export const SettingsIcon: React.FC<SettingsIconProps> = ({ size = 24, color }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" accessible={false}>
    <Path d={GEAR_PATH} fill="none" stroke={color} strokeWidth={1.8} strokeLinejoin="round" />
    <Circle cx={12} cy={12} r={3.2} fill="none" stroke={color} strokeWidth={1.8} />
  </Svg>
);
