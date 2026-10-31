import React, { useMemo } from 'react';
import { SvgXml } from 'react-native-svg';
import { useTheme } from '../theme/ThemeProvider';
import { buildMarkSvg, markColors } from './mark';

interface RupieroMarkProps {
  size: number;
}

/** The stamp mark in the current theme's ink and currency colours. */
export const RupieroMark: React.FC<RupieroMarkProps> = ({ size }) => {
  const { color } = useTheme();
  const xml = useMemo(() => buildMarkSvg(markColors(color)), [color]);
  return <SvgXml xml={xml} width={size} height={size} accessible={false} />;
};
