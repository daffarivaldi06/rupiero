import type React from 'react';
import { useEffect, useState } from 'react';
import { useFonts } from 'expo-font';
import { IBMPlexSans_400Regular } from '@expo-google-fonts/ibm-plex-sans/400Regular';
import { IBMPlexSans_500Medium } from '@expo-google-fonts/ibm-plex-sans/500Medium';
import { IBMPlexSans_600SemiBold } from '@expo-google-fonts/ibm-plex-sans/600SemiBold';
import { IBMPlexSans_700Bold } from '@expo-google-fonts/ibm-plex-sans/700Bold';
import { IBMPlexMono_500Medium } from '@expo-google-fonts/ibm-plex-mono/500Medium';
import { fontNames } from './typography';

/** The longest the app waits for the fonts before it renders with the fallback font. */
export const FONT_TIMEOUT_MS = 3000;

// The same files app.json embeds on Android, under the family names typography.ts uses. Metro bundles
// them into /assets/, so they load from the app's own origin (a CDN font would be blocked by COEP).
const FONTS = {
  [fontNames.regular]: IBMPlexSans_400Regular,
  [fontNames.medium]: IBMPlexSans_500Medium,
  [fontNames.semibold]: IBMPlexSans_600SemiBold,
  [fontNames.bold]: IBMPlexSans_700Bold,
  [fontNames.mono]: IBMPlexMono_500Medium,
};

/**
 * Web: renders nothing until IBM Plex is loaded, so text never flashes in a fallback font. It never
 * blocks the app for good: on a load error, or after FONT_TIMEOUT_MS, it renders anyway and the
 * sans-serif fallback from typography.ts takes over.
 */
export function FontGate({ children }: { children: React.ReactNode }) {
  const [loaded, error] = useFonts(FONTS);
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (loaded || error) return;
    const timer = setTimeout(() => setTimedOut(true), FONT_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [loaded, error]);

  useEffect(() => {
    if (error) console.warn('IBM Plex failed to load, using the fallback font.', error);
  }, [error]);

  useEffect(() => {
    if (timedOut && !loaded && !error) {
      console.warn(`IBM Plex was not loaded after ${FONT_TIMEOUT_MS} ms, using the fallback font.`);
    }
  }, [timedOut, loaded, error]);

  return loaded || error || timedOut ? children : null;
}
