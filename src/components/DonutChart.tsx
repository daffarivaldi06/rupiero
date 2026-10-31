import React from 'react';
import Svg, { Circle } from 'react-native-svg';
import { donutArcs } from '../domain/chart';

export interface DonutSlice {
  key: string;
  value: number;
  color: string;
  opacity: number;
}

interface DonutChartProps {
  slices: DonutSlice[];
  size?: number;
  thickness?: number;
  trackColor: string;
}

/** A thin ring, one arc per slice from the top clockwise; no labels inside (the legend explains it). */
export const DonutChart: React.FC<DonutChartProps> = ({ slices, size = 132, thickness = 14, trackColor }) => {
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const arcs = donutArcs(
    slices.map((s) => s.value),
    circumference,
    slices.length > 1 ? 3 : 0,
  );
  const centre = size / 2;

  return (
    <Svg width={size} height={size} accessible={false}>
      <Circle cx={centre} cy={centre} r={radius} stroke={trackColor} strokeWidth={thickness} fill="none" />
      {arcs.map((arc, i) => (
        <Circle
          key={slices[i].key}
          cx={centre}
          cy={centre}
          r={radius}
          fill="none"
          stroke={slices[i].color}
          strokeOpacity={slices[i].opacity}
          strokeWidth={thickness}
          strokeDasharray={`${arc.length} ${circumference - arc.length}`}
          // Dashes start at 3 o'clock going clockwise; shift back a quarter turn to start at the top.
          strokeDashoffset={circumference / 4 - arc.start}
        />
      ))}
    </Svg>
  );
};
