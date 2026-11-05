import React from 'react';
import Svg, { Line, Path } from 'react-native-svg';

/** Backspace key on a 24×24 grid, matching the eye and the gear (IBM Plex has no ⌫ glyph). */
export const BackspaceIcon: React.FC<{ color: string; size?: number }> = ({ color, size = 24 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" accessible={false}>
    <Path d="M9 5.5 H20 A1.5 1.5 0 0 1 21.5 7 V17 A1.5 1.5 0 0 1 20 18.5 H9 L2.5 12 Z" fill="none" stroke={color} strokeWidth={1.8} strokeLinejoin="round" />
    <Line x1={11.5} y1={9.5} x2={16.5} y2={14.5} stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    <Line x1={16.5} y1={9.5} x2={11.5} y2={14.5} stroke={color} strokeWidth={1.8} strokeLinecap="round" />
  </Svg>
);
