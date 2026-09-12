import { useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { palette, TINTS, mascot, elevation, elevationDark, type TintName, type Colors, type Elevation } from './tokens';

export type Theme = {
  isDark: boolean;
  c: Colors;
  shadow: Elevation;
  tint: (name: TintName) => { bg: string; fg: string };
  /** Pip's colours. Resolved here so the mascot never reaches for the raw token map. */
  pip: (typeof mascot)['light'];
};

/**
 * Resolves the palette to plain colour STRINGS. Reanimated animated styles can
 * consume these directly; never hand a semantic colour object to a worklet.
 */
export function useTheme(): Theme {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  return useMemo(
    () => ({
      isDark,
      c: isDark ? palette.dark : palette.light,
      shadow: isDark ? elevationDark : elevation,
      // Defensive: a tint name persisted by an older build (or a typo) must
      // degrade to a valid swatch, never to `undefined.bg` mid-render.
      tint: (name: TintName) => (TINTS[name] ?? TINTS.lilac)[isDark ? 'dark' : 'light'],
      pip: isDark ? mascot.dark : mascot.light,
    }),
    [isDark]
  );
}
