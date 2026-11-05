import { useWindowDimensions } from 'react-native';

/** Text columns stop growing here; on tablets and in landscape the rest becomes margin. */
export const MAX_CONTENT_WIDTH = 640;

/** Horizontal padding that keeps content at most MAX_CONTENT_WIDTH wide and centred, never below `base`. */
export function useReadableInset(base: number): number {
  const { width } = useWindowDimensions();
  return Math.max(base, Math.round((width - MAX_CONTENT_WIDTH) / 2));
}

/** Window size classes. Desktop layouts start at `wide`. */
export type Breakpoint = 'compact' | 'medium' | 'wide' | 'xl';

/** The smallest window width (px) of each size class above `compact`. */
export const BREAKPOINTS = { medium: 768, wide: 1024, xl: 1280 } as const;

export function breakpointFor(width: number): Breakpoint {
  if (width >= BREAKPOINTS.xl) return 'xl';
  if (width >= BREAKPOINTS.wide) return 'wide';
  if (width >= BREAKPOINTS.medium) return 'medium';
  return 'compact';
}

/**
 * The window's size class, updated on resize. It is the same on every platform: desktop UI must also
 * check `Platform.OS === 'web'` (ADR 0001), so an Android tablet keeps the phone layout.
 */
export function useBreakpoint(): Breakpoint {
  return breakpointFor(useWindowDimensions().width);
}
