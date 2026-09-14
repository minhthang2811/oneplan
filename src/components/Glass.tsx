import { useState, type ReactNode } from 'react';
import { View, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import {
  GlassView, GlassContainer, isLiquidGlassAvailable, isGlassEffectAPIAvailable,
} from 'expo-glass-effect';
import { useTheme } from '../theme/useTheme';
import { glass } from '../theme/tokens';
import { GelSurface, gelInsetShadow } from './Gel';

/**
 * Whether the OS will render REAL Liquid Glass for us.
 *
 * Read once at module load, because it cannot change without relaunching the
 * app: it is a function of the iOS version and the Info.plist the binary was
 * built with. Branching on a constant also keeps the hook order in
 * `GlassPanel` stable, which a runtime check would not.
 *
 * `expo-glass-effect` needs **iOS 26+** and falls back to a plain `View`
 * everywhere else, so everywhere else has to be our own material.
 *
 * ── BOTH CHECKS, NOT JUST THE OBVIOUS ONE ──────────────────────────────────
 * `isLiquidGlassAvailable()` answers "was this binary compiled against an SDK
 * that has Liquid Glass, running on an OS that has it". `isGlassEffectAPIAvailable()`
 * answers "is the API actually there at runtime", which is a different question
 * on the iOS 26 betas that shipped the OS version without the glass API. On
 * those, the first returns true and the second does not — and taking the native
 * path anyway renders a plain, untinted `View` where the tab bar should be:
 * no blur, no material, chrome text sitting directly on whatever scrolled
 * underneath. The painted gel is a far better answer to that than nothing, so
 * the real path requires both.
 */
export const LIQUID_GLASS = isLiquidGlassAvailable() && isGlassEffectAPIAvailable();

/**
 * Makes the glass surfaces inside it FUSE as they approach each other.
 *
 * This is the behaviour that separates Liquid Glass from a blur: two glass
 * objects near each other do not stay two rounded rectangles with a gap, they
 * bulge towards one another and merge, the way two droplets on a windscreen do.
 * The system does the whole thing — there is no way to paint it, which is why
 * the fallback path below simply renders the children and lets them stay apart.
 *
 * It only earns its place where there are genuinely SIBLING floating controls.
 * A single continuous surface has nothing to fuse with, and wrapping one in a
 * container is a layer that costs a native view and buys nothing.
 *
 * `spacing` is the distance at which the merge begins, so it wants to be a
 * little larger than the actual gap between the controls — at exactly the gap,
 * the two only start reaching for each other once they are already touching.
 */
export function GlassGroup({
  children, spacing = 22, style,
}: {
  children: ReactNode;
  spacing?: number;
  style?: StyleProp<ViewStyle>;
}) {
  if (!LIQUID_GLASS) return <View style={style}>{children}</View>;
  return (
    <GlassContainer spacing={spacing} style={style}>
      {children}
    </GlassContainer>
  );
}

/**
 * The app's one glass primitive, with TWO IMPLEMENTATIONS.
 *
 * On **iOS 26+** it is Apple's real Liquid Glass (`expo-glass-effect`), which
 * refracts the live content behind it, lenses light around its own edges and
 * adapts its contrast to whatever is underneath. Nothing painted can do that.
 *
 * Everywhere else — **iOS 25 and older, and Android** — it is the hand-built
 * gel below: a blur, a legibility scrim, the convex lighting from `Gel.tsx`,
 * and an inset rim that makes the surface bulge toward you. That path is a
 * deliberate imitation of the real one and is documented as such.
 *
 * The two paths share nothing but this component's props: the constraints that
 * govern the painted one — `BlurView`'s quirks, the clipping, the measurement
 * pass — apply ONLY to it, and are documented on `PaintedPanel` below rather
 * than here, so a reader on the native path is not told about traps that do
 * not exist for them.
 */
export function GlassPanel({
  children, radius, style, contentStyle, shadowLevel = 3, interactive = false,
}: {
  children: ReactNode;
  radius: number;
  /** Applied to the OUTER (shadow-casting) wrapper — position it with this. */
  style?: StyleProp<ViewStyle>;
  /** Applied to the INNER (clipping) surface — size and lay out with this. */
  contentStyle?: StyleProp<ViewStyle>;
  shadowLevel?: 0 | 1 | 2 | 3;
  /**
   * Lets the system deform the material under a finger — the glass swells
   * towards the touch and settles back when it is released.
   *
   * Off by default, and deliberately so: it is the single most eye-catching
   * thing the material does, which makes it the easiest to overuse. It belongs
   * on surfaces the user actually manipulates — the tab bar is dragged — and
   * not on surfaces that merely sit there, where a pane that squirms under an
   * accidental brush reads as instability rather than as material.
   *
   * No effect off the native path: a painted gel cannot deform, and animating
   * it to try would repaint the whole gradient stack every frame, which the
   * metaball investigation already measured at 15fps.
   */
  interactive?: boolean;
}) {
  const { c, shadow } = useTheme();

  /**
   * THE NATIVE PATH. On iOS 26 the system draws real Liquid Glass, and it does
   * things no amount of painting can: it refracts and lenses the actual content
   * moving behind it, bends light around its own edges, and adapts its own
   * contrast to whatever scrolls underneath. Everything below this branch is a
   * hand-built imitation of that, and the imitation should never run when the
   * real thing is available.
   *
   * `regular`, not `clear`. Clear is for surfaces over media-rich content and
   * needs its own dimming layer underneath to stay legible; this bar floats
   * over arbitrary text and cards, which is the case `regular` is built to
   * adapt to on its own.
   *
   * No `GlassContainer` here. That exists to make SIBLING glass views fuse when
   * they come near each other — a row of separate floating controls — and this
   * is one continuous surface, so there is nothing to fuse with.
   *
   * The shadow still lives on an outer wrapper, for the same reason it always
   * did: a rounded, clipping surface cannot cast its own.
   */
  if (LIQUID_GLASS) {
    return (
      <View style={[{ borderRadius: radius, boxShadow: shadow[shadowLevel] }, style]}>
        <GlassView
          glassEffectStyle="regular"
          isInteractive={interactive}
          /**
           * The legibility tint, applied to the MATERIAL rather than painted
           * over it. Real Liquid Glass refracts live content, which is the
           * whole point of it and also the whole risk: without this, the words
           * on a card scrolling underneath read straight through the bar and
           * compete with the tab labels, so contrast becomes a property of the
           * user's own data. Apple's guidance is to tint and dim the material
           * itself rather than to stack a scrim on top, because a scrim would
           * be a second layer sitting on the glass.
           */
          tintColor={c.glassTint}
          style={[
            { borderRadius: radius, borderCurve: 'continuous' },
            contentStyle,
          ]}
        >
          {children}
        </GlassView>
      </View>
    );
  }

  return (
    <PaintedPanel
      radius={radius}
      style={style}
      contentStyle={contentStyle}
      shadowLevel={shadowLevel}
    >
      {children}
    </PaintedPanel>
  );
}

/**
 * THE FALLBACK PANE — iOS 25 and older, and Android.
 *
 * A separate component rather than a branch inside `GlassPanel`, so that none
 * of its machinery exists on the native path: the measurement state below is
 * allocated only where something actually measures, and the traps documented
 * here are only read by someone looking at the code that suffers from them.
 *
 * ── THE THREE STRUCTURAL TRAPS ─────────────────────────────────────────────
 * 1. `BlurView` IGNORES an explicit `borderRadius` (documented in expo-blur),
 *    so the rounding has to come from a parent that clips it.
 * 2. On iOS `overflow: 'hidden'` sets `masksToBounds`, which clips the view's
 *    own drop shadow away. So the shadow cannot live on the clipping view —
 *    hence the outer wrapper here, whose only job is to cast it.
 * 3. Blur alone does not separate a pane from its background; the lit edge
 *    does.
 *
 * The scrim over the blur is not decoration either: without it, chrome text
 * sits on whatever happens to have scrolled underneath, and contrast becomes a
 * property of the user's data. The real Liquid Glass path gets the same
 * protection from `tintColor` instead.
 */
function PaintedPanel({
  children, radius, style, contentStyle, shadowLevel,
}: {
  children: ReactNode;
  radius: number;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  shadowLevel: 0 | 1 | 2 | 3;
}) {
  const { c, shadow, isDark } = useTheme();

  /**
   * The gel layers are drawn in SVG, and SVG needs real numbers — a percentage
   * `rx` cannot express "a pill" and a percentage stroke cannot be a hairline.
   * So the pane measures itself once and the lighting appears on the next
   * frame. The blur and the scrim are already painted by then, so there is no
   * visible pop; what would pop is guessing the height and getting the corner
   * radius wrong.
   */
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);

  return (
    <View style={[{ borderRadius: radius, boxShadow: shadow[shadowLevel] }, style]}>
      <View
        onLayout={(e) => {
          const { width: w, height: h } = e.nativeEvent.layout;
          setSize((prev) => (prev && prev.w === w && prev.h === h ? prev : { w, h }));
        }}
        style={[
          {
            borderRadius: radius,
            borderCurve: 'continuous',
            overflow: 'hidden',
            /**
             * The convex rim shading. Inset shadows draw INSIDE the view, so
             * unlike the drop shadow on the wrapper above they survive
             * `overflow: 'hidden'` perfectly happily — and they follow the
             * pill's corners, which is the entire reason they are not painted
             * as another gradient.
             */
            boxShadow: gelInsetShadow(c.glassInnerShade, c.glassSpecular),
          },
          contentStyle,
        ]}
      >
        <BlurView
          // Explicit light/dark variants rather than the adaptive material:
          // the app already knows the scheme, and an adaptive tint can resolve
          // against the wrong trait collection inside a detached overlay.
          tint={isDark ? 'systemThickMaterialDark' : 'systemThickMaterialLight'}
          intensity={glass.intensity}
          blurMethod="dimezisBlurViewSdk31Plus"
          blurReductionFactor={glass.reductionFactor}
          pointerEvents="none"
          style={StyleSheet.absoluteFill}
        />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: c.glassTint }]} pointerEvents="none" />

        {size ? <GelSurface w={size.w} h={size.h} radius={radius} /> : null}

        {children}
      </View>
    </View>
  );
}
