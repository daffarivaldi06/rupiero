import React from 'react';
import Svg, { Circle, Line, Path } from 'react-native-svg';

interface EyeIconProps {
  /** Struck through when amounts are hidden. */
  closed: boolean;
  color: string;
  size?: number;
}

/** Line eye on a 24×24 grid, matching the settings gear. */
export const EyeIcon: React.FC<EyeIconProps> = ({ closed, color, size = 24 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" accessible={false}>
    <Path
      d="M2 12 C4.5 7.5 8 5.5 12 5.5 C16 5.5 19.5 7.5 22 12 C19.5 16.5 16 18.5 12 18.5 C8 18.5 4.5 16.5 2 12 Z"
      fill="none"
      stroke={color}
      strokeWidth={1.8}
      strokeLinejoin="round"
    />
    <Circle cx={12} cy={12} r={3.2} fill="none" stroke={color} strokeWidth={1.8} />
    {closed && <Line x1={4} y1={20} x2={20} y2={4} stroke={color} strokeWidth={1.8} strokeLinecap="round" />}
  </Svg>
);
