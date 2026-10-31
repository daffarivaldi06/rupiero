import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { barHeights } from '../domain/chart';
import { formatMonthLabel, formatMonthShort, type Month } from '../domain/dates';
import { useThemedStyles, type Theme } from '../theme/ThemeProvider';
import { Txt } from './Txt';

interface TrendBarsProps {
  points: { month: Month; value: number }[];
  color: string;
  selected: Month;
  onSelect: (month: Month) => void;
  height?: number;
}

/** Plain bars on an ink baseline, one per month; the selected month is solid, the others muted. */
export const TrendBars: React.FC<TrendBarsProps> = ({ points, color, selected, onSelect, height = 96 }) => {
  const styles = useThemedStyles(makeStyles);
  const heights = barHeights(
    points.map((p) => p.value),
    height,
  );

  return (
    <View>
      <View style={[styles.bars, { height }]}>
        {points.map((point, i) => {
          const isSelected = point.month === selected;
          return (
            <Pressable
              key={point.month}
              onPress={() => onSelect(point.month)}
              style={styles.slot}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={formatMonthLabel(point.month)}
            >
              <View style={[styles.bar, { height: heights[i], backgroundColor: color, opacity: isSelected ? 1 : 0.4 }]} />
            </Pressable>
          );
        })}
      </View>
      <View style={styles.baseline} />
      <View style={styles.labels}>
        {points.map((point) => (
          <Txt
            key={point.month}
            variant="caption"
            tone={point.month === selected ? 'ink' : 'inkMuted'}
            style={styles.label}
          >
            {formatMonthShort(point.month).split(' ')[0]}
          </Txt>
        ))}
      </View>
    </View>
  );
};

const makeStyles = ({ color, space }: Theme) =>
  StyleSheet.create({
    bars: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: space.sm,
    },
    slot: {
      flex: 1,
      height: '100%',
      justifyContent: 'flex-end',
    },
    bar: {
      borderTopLeftRadius: 2,
      borderTopRightRadius: 2,
    },
    baseline: {
      height: 1,
      backgroundColor: color.ink,
    },
    labels: {
      flexDirection: 'row',
      gap: space.sm,
      marginTop: space.xs,
    },
    label: {
      flex: 1,
      textAlign: 'center',
    },
  });
