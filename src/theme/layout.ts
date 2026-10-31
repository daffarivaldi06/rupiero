import { useWindowDimensions } from 'react-native';

/** Text columns stop growing here; on tablets and in landscape the rest becomes margin. */
export const MAX_CONTENT_WIDTH = 640;

/** Horizontal padding that keeps content at most MAX_CONTENT_WIDTH wide and centred, never below `base`. */
export function useReadableInset(base: number): number {
  const { width } = useWindowDimensions();
  return Math.max(base, Math.round((width - MAX_CONTENT_WIDTH) / 2));
}
