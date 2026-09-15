import { useId, type ReactNode } from 'react';
import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import Animated, {
  useAnimatedStyle, useReducedMotion, interpolate, Extrapolation,
} from 'react-native-reanimated';
import { Txt } from './Txt';
import { useChrome } from './Chrome';
import { useTheme } from '../theme/useTheme';
import { glass, scrollEdge, space } from '../theme/tokens';
import { svgStop } from '../theme/svgColor';

/** How tall the blurred band is, below the safe-area inset. Exported so a
 *  screen can pad its content clear of the controls pinned inside it. */
export const SCROLL_EDGE_BAND = 44;
const BAND = SCROLL_EDGE_BAND;

/**
 * THE SCROLL EDGE EFFECT.
 *
 * Apple's own name for it, and their own description of the job: "Scroll edge
 * effects further enhance legibility by blurring and reducing the opacity of
 * background content." It is the top counterpart to the floating tab bar — as
 * a day scrolls up under the status bar, a graded blur builds at the top so
 * the clock and the compact title stay readable, and it goes away again when
 * the user scrolls back to the top of their day.
 *
 * ── WHY THIS IS BLUR AND NOT `GlassPanel` ──────────────────────────────────
 * It would be easy to assume everything translucent in an iOS 26 app should be
 * Liquid Glass, and doing that here would be wrong on Apple's own terms. The
 * HIG separates the two: Liquid Glass "forms a distinct functional layer for
 * controls and navigation elements ... that floats above the content layer",
 * while the scroll edge effect is a LEGIBILITY treatment applied to the
 * content passing underneath. This band contains no controls. Giving it the
 * material would put a second floating glass object on screen competing with
 * the tab bar — exactly the "use Liquid Glass sparingly" failure — and it
 * would read as a bar that is always there rather than as an effect that
 * builds.
 *
 * ── THE PROGRESSIVE BLUR ───────────────────────────────────────────────────
 * A single `BlurView` has a hard bottom edge, and a hard edge is the tell: the
 * real effect ramps out, so what you notice is that the text got readable and
 * not that a panel appeared. There is no gradient-mask primitive here, so the
 * ramp is built by STACKING bands that all start at the top and end at
 * different heights. Content at the very top passes under all four and is
 * blurred four times; content at the bottom of the band passes under one. The
 * accumulation is the gradient.
 *
 * Each band therefore runs at a FRACTION of the usual intensity — four bands
 * at `glass.intensity` would be an opaque slab at the top.
 *
 * ── WHAT ANIMATES, AND WHAT DELIBERATELY DOES NOT ──────────────────────────
 * Only the container's OPACITY. Animating `intensity` instead is the obvious
 * implementation and it re-renders the blur every frame, which is the same
 * per-frame re-rasterisation the tab bar's metaball investigation measured at
 * 15fps. A fixed-intensity blur cross-faded by opacity is one composite of an
 * already-rendered layer, and it looks identical: a blur at 40% opacity IS a
 * 40%-strength blur, because what shows through is the unblurred content.
 */
export function ScrollEdge({
  title, subtitle, leading, trailing,
}: {
  /** The compact title that takes over once the large one has scrolled away. */
  title: string;
  subtitle?: string;
  /**
   * Controls pinned at the LEADING edge of the band, outside the fade.
   *
   * This is where a back button belongs, and it is the reason the band has a
   * foreground layer at all. A back affordance that scrolls away with the
   * content is the one thing iOS never does: the whole point of a navigation
   * bar is that the way out does not move. The band's blur fades with the
   * scroll; whatever is passed here does not.
   */
  leading?: ReactNode;
  /** Optional controls pinned in the band. Kept small — this is not a toolbar. */
  trailing?: ReactNode;
}) {
  const { c, isDark } = useTheme();
  const chrome = useChrome();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const height = insets.top + BAND;

  const tint = svgStop(c.glassTint);
  // Gradient ids resolve per `<Svg>` document, but two screens both defining
  // `#edgeScrim` is the kind of thing that works until the day it does not.
  const uid = useId().replace(/:/g, '');

  /**
   * The blur's own strength. Ramps over `scrollEdge.ramp` points of travel —
   * short enough that it has arrived by the time the first row is under it,
   * long enough that it reads as building rather than switching on.
   */
  const bandStyle = useAnimatedStyle(() => ({
    opacity: interpolate((chrome?.y.get() ?? 0), [0, scrollEdge.ramp], [0, 1], Extrapolation.CLAMP),
  }));

  /**
   * The compact title.
   *
   * Position-driven, not direction-driven. iOS's own large-title collapse
   * works this way, and it is the behaviour that makes "scroll back up to
   * reveal the header" true without any extra mechanism: the big title
   * returning IS the compact one leaving, because they are two readings of one
   * scroll offset. A direction-driven version would let you sit halfway down a
   * day with the big title showing over rows it does not belong to.
   *
   * It starts later than the blur — the blur exists to make content legible
   * under the status bar, which is needed immediately; the compact title only
   * earns its place once the real one is actually gone.
   */
  const titleStyle = useAnimatedStyle(() => {
    const t = interpolate(
      (chrome?.y.get() ?? 0),
      [scrollEdge.hideAfter, scrollEdge.hideAfter + scrollEdge.ramp],
      [0, 1],
      Extrapolation.CLAMP
    );
    if (reduced) return { opacity: t, transform: [] };
    return { opacity: t, transform: [{ translateY: (1 - t) * 10 }] };
  });

  return (
    <View
      // The band is an EFFECT, not a bar: it must never intercept a tap meant
      // for the row scrolling underneath it. `box-none` lets the optional
      // trailing controls stay tappable while the band itself does not.
      pointerEvents={leading || trailing ? 'box-none' : 'none'}
      style={{ position: 'absolute', top: 0, left: 0, right: 0, height }}
    >
      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, bandStyle]}
      >
        {/* Four bands, all anchored at the top, ending at different heights.
            The overlap is the gradient — see the note above. */}
        {[1, 0.78, 0.54, 0.28].map((f) => (
          <BlurView
            key={f}
            // Explicit light/dark variants rather than the adaptive material,
            // for the same reason the tab bar uses them: an adaptive tint can
            // resolve against the wrong trait collection inside an overlay,
            // and this app now also has an appearance OVERRIDE, which the
            // adaptive material would not know about at all.
            tint={isDark ? 'systemThickMaterialDark' : 'systemThickMaterialLight'}
            intensity={glass.intensity / 2.4}
            blurMethod="dimezisBlurViewSdk31Plus"
            blurReductionFactor={glass.reductionFactor}
            pointerEvents="none"
            style={{ position: 'absolute', top: 0, left: 0, right: 0, height: height * f }}
          />
        ))}

        {/* The legibility scrim, fading to nothing at the bottom so the band
            does not end in a visible line. Same job as `glassTint` on the tab
            bar: without it the compact title sits on whatever happens to have
            scrolled underneath. */}
        <Svg width="100%" height={height} style={StyleSheet.absoluteFill} pointerEvents="none">
          <Defs>
            <LinearGradient id={`edgeScrim${uid}`} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={tint.stopColor} stopOpacity={tint.stopOpacity} />
              <Stop offset="0.62" stopColor={tint.stopColor} stopOpacity={tint.stopOpacity * 0.72} />
              <Stop offset="1" stopColor={tint.stopColor} stopOpacity={0} />
            </LinearGradient>
          </Defs>
          <Rect x={0} y={0} width="100%" height={height} fill={`url(#edgeScrim${uid})`} />
        </Svg>
      </Animated.View>

      <View
        pointerEvents="box-none"
        style={{
          position: 'absolute', left: 0, right: 0, bottom: 0, height: BAND,
          flexDirection: 'row', alignItems: 'center',
          paddingHorizontal: space.lg, gap: space.sm,
        }}
      >
        {leading}
        <Animated.View style={[{ flex: 1 }, titleStyle]} pointerEvents="none">
          <Txt variant="title" numberOfLines={1}>{title}</Txt>
          {subtitle ? (
            <Txt variant="caption" tone="muted" numberOfLines={1}>{subtitle}</Txt>
          ) : null}
        </Animated.View>
        {trailing}
      </View>
    </View>
  );
}
