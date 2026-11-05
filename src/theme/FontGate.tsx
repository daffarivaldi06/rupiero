import type React from 'react';

/**
 * Native: IBM Plex is embedded in the build by the expo-font config plugin (see app.json), so there
 * is nothing to wait for. The web version (FontGate.web.tsx) loads the fonts first.
 */
export function FontGate({ children }: { children: React.ReactNode }) {
  return children;
}
