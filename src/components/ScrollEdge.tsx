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
 * not that a panel appeared. There is no gradient-mask primitive in React
 * Native, so the ramp is built by STACKING bands that all start at the top and
 * end at different heights. Content at the very top passes under all of them;
 * content at the bottom passes under one. The accumulation is the gradient.
 *
 * ── THE SCRIM IS THE EFFECT; THE BLUR IS THE GARNISH ──────────────────────
 * This took three goes to get right, and the first two both failed by treating
 * the blur as the whole thing.
 *
 * Apple's own description has two halves — "blurring and REDUCING THE OPACITY
 * of background content" — and only the first was implemented. The scrim was
 * `glassTint`, borrowed from the tab bar, where the entire point of the
 * material is that you can still see movement behind it. Over a scrolling page
 * that is far too weak. On a screen of text you get away with it; on the Me
 * screen, where a drawing of a dog passes under the bar, the drawing stayed
 * clearly visible and a blurred illustration reads as a COLOURED SMEAR — dirt
 * on the glass rather than something politely getting out of the way.
 *
 * So the scrim now peaks at 0.92, holds through the whole bar, and is painted
 * in the CANVAS colour — the page's own — so that content does not fade into a
 * pale grey bar, it dissolves into the background. Reminders is the reference:
 * the rows behind its scrolled top are barely there at all.
 *
 * ── AND THE BLUR HAS TO END BEFORE THE SCRIM DOES ─────────────────────────
 * A `BlurView` blurs within its own bounds and nothing below, so wherever the
 * longest band ends there is a hard horizontal line IN THE CONTENT — blurred
 * above, sharp below. Ramping the blur's strength cannot move that line or
 * soften it; on an illustration it cuts straight through the picture, which is
 * exactly what the second version looked like.
 *
 * The bands therefore stop at 0.68 of the effect's height, while the scrim
 * runs to 1.0. The step lands under roughly half a page of cover, between a
 * barely-blurred region and a sharp one, and disappears. Blur ends first,
 * scrim ends last — that ordering is the whole design.
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
  /** Where the bar's CONTENT ends. */
  const height = insets.top + BAND;
  /** Where the EFFECT ends — further down, in space nothing is laid out in. */
  const blurred = height + scrollEdge.fade;

  /**
   * THE PAGE'S OWN COLOUR, not a token.
   *
   * Every screen that mounts a `ScrollEdge` sits on `c.canvas`, and the trick
   * only works because the scrim matches what is underneath: a scrim of the
   * page's colour makes content dissolve into the background, while anything
   * lighter or darker paints a visible bar across the top instead.
   */
  const tint = svgStop(c.canvas);
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
      style={{ position: 'absolute', top: 0, left: 0, right: 0, height: blurred }}
    >
      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, bandStyle]}
      >
        {/* The weighted stack. All anchored at the top, ending at different
            heights; the accumulation is the gradient and the weighting is what
            keeps the steps between them invisible — see the note above. */}
        {scrollEdge.bands.map((band) => (
          <BlurView
            key={band.h}
            // Explicit light/dark variants rather than the adaptive material,
            // for the same reason the tab bar uses them: an adaptive tint can
            // resolve against the wrong trait collection inside an overlay,
            // and this app now also has an appearance OVERRIDE, which the
            // adaptive material would not know about at all.
            tint={isDark ? 'systemThickMaterialDark' : 'systemThickMaterialLight'}
            // `intensity` is a 1-100 scale, so a band's share has to be
            // clamped rather than merely multiplied: the outermost band is
            // deliberately down at a few percent, which is a real blur and
            // must not round to nothing.
            intensity={Math.max(1, Math.round(glass.intensity * band.w))}
            blurMethod="dimezisBlurViewSdk31Plus"
            blurReductionFactor={glass.reductionFactor}
            pointerEvents="none"
            style={{ position: 'absolute', top: 0, left: 0, right: 0, height: blurred * band.h }}
          />
        ))}

        {/* The scrim, and it is doing most of the work — see the note above.
            Full strength through the bar so the clock and the compact title
            never sit on the user's own content, and landing FLAT at the bottom
            rather than running out in a straight line, because a linear fade to
            zero still has a corner the eye reads as a line. */}
        <Svg width="100%" height={blurred} style={StyleSheet.absoluteFill} pointerEvents="none">
          <Defs>
            <LinearGradient id={`edgeScrim${uid}`} x1="0" y1="0" x2="0" y2="1">
              {scrollEdge.scrimStops.map((offset, i) => (
                <Stop
                  key={offset}
                  offset={offset}
                  stopColor={tint.stopColor}
                  // `canvas` is an opaque hex, so `stopOpacity` is the alpha
                  // outright rather than a fraction of the token's own.
                  stopOpacity={scrollEdge.scrimAlphas[i]}
                />
              ))}
            </LinearGradient>
          </Defs>
          <Rect x={0} y={0} width="100%" height={blurred} fill={`url(#edgeScrim${uid})`} />
        </Svg>
      </Animated.View>

      {/* Pinned to the TOP inset rather than to this view's bottom, because
          the view now extends past the bar to carry the fade. */}
      <View
        pointerEvents="box-none"
        style={{
          position: 'absolute', left: 0, right: 0, top: insets.top, height: BAND,
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
