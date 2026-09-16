import { useEffect, useMemo } from 'react';
import { Appearance, useColorScheme } from 'react-native';
import { palette, TINTS, elevation, elevationDark, type TintName, type Colors, type Elevation } from './tokens';
import { usePlanStore } from '../store/usePlanStore';

export type Theme = {
  isDark: boolean;
  c: Colors;
  shadow: Elevation;
  tint: (name: TintName) => { bg: string; fg: string };
};

/**
 * Resolves the palette to plain colour STRINGS. Reanimated animated styles can
 * consume these directly; never hand a semantic colour object to a worklet.
 *
 * ── WHY THE PREFERENCE IS NOT JUST `Appearance.setColorScheme()` ───────────
 * React Native ships exactly the API this feature wants: `setColorScheme`
 * overrides the window's interface style, and `useColorScheme()` reads it back.
 * Driving the whole feature from that alone is the obvious implementation and
 * it is subtly wrong, because of what `setColorScheme` does NOT do:
 *
 *     export function setColorScheme(colorScheme) {
 *       NativeAppearance.setColorScheme(colorScheme);
 *       state.appearance = { colorScheme: ... };     // <- mutates
 *     }                                              // <- never emits 'change'
 *
 * `useColorScheme()` is a `useSyncExternalStore` over that emitter, so a
 * programmatic override updates the cached value but does not, by itself,
 * notify a single subscriber. What actually re-renders the app is the NATIVE
 * trait change echoing back through `appearanceChanged` — a round trip that is
 * a frame late at best and, on a platform that does not re-emit for an
 * override it was itself asked to apply, never arrives.
 *
 * So the preference is resolved from the STORE, which is synchronous and
 * re-renders on write like any other state, and `setColorScheme` is called
 * alongside it for the things the store cannot reach: `ActionSheetIOS`, the
 * system `Switch`, `Alert`, the keyboard, and the scroll indicators. The store
 * decides what the app looks like; the native call keeps the platform's own
 * chrome from disagreeing with it.
 */
export function useTheme(): Theme {
  const system = useColorScheme();
  const pref = usePlanStore((s) => s.profile.appearance);

  // `?? 'system'` is not defensive padding — a profile persisted before this
  // key existed rehydrates without it, and the migration backfills it, but the
  // first render after an upgrade can still beat the migration on a cold path.
  const isDark = pref === 'dark' || (pref !== 'light' && system === 'dark');

  return useMemo(
    () => ({
      isDark,
      c: isDark ? palette.dark : palette.light,
      shadow: isDark ? elevationDark : elevation,
      // Defensive: a tint name persisted by an older build (or a typo) must
      // degrade to a valid swatch, never to `undefined.bg` mid-render.
      tint: (name: TintName) => (TINTS[name] ?? TINTS.lilac)[isDark ? 'dark' : 'light'],
    }),
    [isDark]
  );
}

/**
 * Pushes the stored preference down to the platform.
 *
 * Mounted ONCE, at the root. Two copies would not corrupt anything — the call
 * is idempotent — but every `useTheme()` in the app would be racing to set the
 * same window property on every render.
 *
 * `'unspecified'` is the value that CLEARS an override rather than one that
 * selects a scheme: React Native re-reads the real system scheme when it sees
 * it, which is what makes "System" able to follow the device again after the
 * user has been on an explicit choice.
 */
export function useAppearanceSync(): void {
  const pref = usePlanStore((s) => s.profile.appearance);

  useEffect(() => {
    Appearance.setColorScheme(
      pref === 'light' ? 'light' : pref === 'dark' ? 'dark' : 'unspecified'
    );
  }, [pref]);
}
