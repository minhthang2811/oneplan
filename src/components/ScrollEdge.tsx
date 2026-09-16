import { useCallback, useRef, type ReactNode } from 'react';
import { View, useWindowDimensions, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { BlurView } from 'expo-blur';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, useReducedMotion,
  Easing, type SharedValue,
} from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Txt } from './Txt';
import { useTheme } from '../theme/useTheme';
import { glass, space } from '../theme/tokens';

/**
 * THE SCROLL EDGE EFFECT — iOS 26's "soft edge", rebuilt.
 *
 * ── What this is imitating ─────────────────────────────────────────────────
 * From iOS 26, a scroll view running underneath a navigation bar gets an
 * automatic treatment at that edge so the bar's own text stays legible over
 * whatever is passing beneath it. Apple ships two styles:
 *
 *   SOFT  — a blur that is strongest at the very top and DISSOLVES downward to
 *           nothing. Content fades out as it travels up under the bar.
 *   HARD  — a flat blurred slab with a defined boundary. This is what iOS 18
 *           and earlier did, and it is what "a bar parked on top of the
 *           content" looks like.
 *
 * This component is the soft one, deliberately. A hard edge is the clunky
 * version: it cuts the list with a visible line, and the line is the thing the
 * eye keeps catching.
 *
 * ── Why the blur is a STACK ────────────────────────────────────────────────
 * A single `BlurView` is a rectangle of uniform blur, so its bottom edge is a
 * step change in sharpness — a hard edge with extra steps. React Native has no
 * mask primitive to feather one with, so the gradient is built from geometry:
 * N panes, all anchored at the top, each shorter than the last.
 *
 *     ┌──────────────┐  ← all N cover here          strongest
 *     ├──────────────┤
 *     │  ┌───────────┤  ← N-1 cover here
 *     │  │  ┌────────┤
 *     │  │  │  ┌─────┤  ← 1 covers here             weakest
 *     └──┴──┴──┴─────┘  ← 0 cover here              nothing
 *
 * Heights are `h(i) = H · (N-i)/N`, which makes the number of panes over any
 * given depth fall LINEARLY to zero at the bottom. The consequence that matters
 * is the last one: coverage reaches zero exactly at the bottom edge, so the
 * effect has no boundary to see. What remains is N discrete steps, and they
 * stay below the perceptual threshold only because each pane's intensity is
 * small — which is why `LAYER_INTENSITY` is 7 and not 40.
 *
 * ── Why the fade is TIME-based, not scroll-linked ──────────────────────────
 * UIKit does not interpolate the bar background against scroll offset; it
 * crossfades between `scrollEdgeAppearance` and `standardAppearance` when the
 * content passes under. Matching that is both more faithful and far more
 * robust here: `FlashList` intercepts `onScroll` and re-dispatches it from JS,
 * so a Reanimated scroll handler attached to it never reaches the UI thread.
 * A JS callback that flips one boolean, with the animation itself running on
 * the UI thread, sidesteps that entirely and costs nothing per frame.
 *
 * The two thresholds are not equal ON PURPOSE. A single threshold makes the
 * effect flicker on and off while a finger rests near it; `APPEAR` above `HIDE`
 * gives the state a deadband it has to be pushed out of.
 */

/** Height of the compact bar itself — a UIKit navigation bar is 44pt. */
export const EDGE_BAR = 44;

/**
 * How far BELOW the bar the blur keeps tapering.
 *
 * Without it the gradient would have to complete inside the bar and would be
 * too steep to read as a dissolve. Apple's effect likewise spills past the bar.
 */
const TAPER = 30;

const LAYERS = 7;
const LAYER_INTENSITY = 7;
/**
 * Android blurs are expensive, so it gets two panes working harder rather than
 * seven. The intensity is higher because Android DIVIDES it by
 * `blurReductionFactor` (4.6 here, matching the tab bar) — 46 there lands in
 * roughly the same place 7 does on iOS.
 */
const ANDROID_LAYERS = 2;
const ANDROID_LAYER_INTENSITY = 46;

/** Scroll offsets, in points, that turn the effect on and off. */
const APPEAR = 14;
const HIDE = 4;

const IN = { duration: 220, easing: Easing.out(Easing.quad) } as const;
const OUT = { duration: 260, easing: Easing.out(Easing.quad) } as const;

/**
 * Drives the edge effect from a scroll view.
 *
 * Returns the props to spread on the scrollable, plus the 0→1 shared value that
 * `ScrollEdge` animates against. Both consumers read one source of truth, so a
 * screen cannot end up with a bar that disagrees with its own list.
 */
export function useScrollEdge(): {
  edge: SharedValue<number>;
  scrollProps: {
    onScroll: (e: NativeSyntheticEvent<NativeScrollEvent>) => void;
    scrollEventThrottle: number;
  };
} {
  const edge = useSharedValue(0);
  const reduced = useReducedMotion();
  /**
   * The current state, on the JS side.
   *
   * A ref, not state: this is read and written once per scroll event and must
   * never cause a re-render — re-rendering a list on every scroll frame is the
   * exact cost this design exists to avoid.
   */
  const shown = useRef(false);

  const onScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const y = e.nativeEvent.contentOffset.y;
      if (!shown.current && y > APPEAR) {
        shown.current = true;
        edge.set(reduced ? 1 : withTiming(1, IN));
      } else if (shown.current && y < HIDE) {
        shown.current = false;
        edge.set(reduced ? 0 : withTiming(0, OUT));
      }
    },
    [edge, reduced]
  );

  return { edge, scrollProps: { onScroll, scrollEventThrottle: 16 } };
}

/**
 * The overlay itself: the graduated blur, the legibility wash, and whatever
 * compact chrome the screen wants sitting in it.
 *
 * Rendered AFTER the list in the tree, never before. expo-blur documents that a
 * `BlurView` mounted ahead of the dynamic content it is supposed to be blurring
 * does not update — the blur freezes on whatever was there at mount.
 *
 * TOUCHES PASS STRAIGHT THROUGH, deliberately. A UIKit navigation bar swallows
 * touches in its own frame because it IS a bar, with controls in it. This is an
 * effect rather than a bar: there is nothing here to hit except a title that is
 * a duplicate of one already in the list. Blocking the top 100pt of a scroll
 * view would mean a row half-visible under the taper could not be tapped, which
 * is a worse outcome than letting the finger reach what it is pointing at.
 */
export function ScrollEdge({
  edge,
  children,
}: {
  edge: SharedValue<number>;
  children?: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { c, isDark } = useTheme();

  const height = insets.top + EDGE_BAR;
  const total = height + TAPER;

  const android = process.env.EXPO_OS === 'android';
  const count = android ? ANDROID_LAYERS : LAYERS;
  const strength = android ? ANDROID_LAYER_INTENSITY : LAYER_INTENSITY;

  const fade = useAnimatedStyle(() => ({ opacity: edge.get() }));

  return (
    <View
      pointerEvents="box-none"
      style={{ position: 'absolute', top: 0, left: 0, right: 0, height }}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          { position: 'absolute', top: 0, left: 0, right: 0, height: total },
          fade,
        ]}
      >
        {Array.from({ length: count }, (_, i) => (
          <BlurView
            key={i}
            /**
             * `default` — the adaptive material, NOT one of the `systemThick*`
             * ones the tab bar uses. Those carry a heavy tint of their own, and
             * seven of them stacked would render an opaque slab rather than a
             * gradient. The colour here comes from the wash below instead,
             * where it can be controlled as one value.
             */
            tint={isDark ? 'dark' : 'light'}
            intensity={strength}
            blurMethod="dimezisBlurViewSdk31Plus"
            blurReductionFactor={glass.reductionFactor}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: (total * (count - i)) / count,
            }}
          />
        ))}

        {/*
          The legibility wash, on the same falling curve as the blur.

          Blur alone does not guarantee contrast — it only smears what is
          underneath, and a dark task title smeared is still dark. This is the
          layer that makes the bar's own text safe to read over an arbitrary
          list, and it has to fade out on exactly the same profile as the blur
          or the two edges become visible as two separate boundaries.
        */}
        {/* Explicit pixel dimensions, not percentages: react-native-svg resolves
            a numeric size deterministically, and the edge always spans the full
            window width anyway. */}
        <Svg width={width} height={total} style={{ position: 'absolute', top: 0, left: 0 }}>
          <Defs>
            <LinearGradient id="edgeWash" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={c.canvas} stopOpacity={isDark ? 0.86 : 0.8} />
              <Stop
                offset={(height / total).toFixed(3)}
                stopColor={c.canvas}
                stopOpacity={isDark ? 0.4 : 0.34}
              />
              <Stop offset="1" stopColor={c.canvas} stopOpacity={0} />
            </LinearGradient>
          </Defs>
          <Rect x={0} y={0} width={width} height={total} fill="url(#edgeWash)" />
        </Svg>
      </Animated.View>

      {children ? (
        <View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: insets.top,
            height: EDGE_BAR,
            paddingHorizontal: space.lg,
            justifyContent: 'center',
          }}
          pointerEvents="box-none"
        >
          {children}
        </View>
      ) : null}
    </View>
  );
}

/**
 * The collapsed title that arrives in the bar once the big one has scrolled
 * away — iOS's large-title behaviour, in the app's own type.
 *
 * It rises 6pt as it fades. That tiny travel is what sells it as the SAME title
 * arriving from below rather than a second one switching on: a pure crossfade
 * reads as two labels, a crossfade with displacement reads as one moving.
 *
 * `accessibilityElementsHidden` because it is a duplicate: the real title is
 * still in the list, and VoiceOver announcing the screen name twice as the user
 * scrolls is noise.
 */
export function ScrollEdgeTitle({
  edge,
  title,
}: {
  edge: SharedValue<number>;
  title: string;
}) {
  const anim = useAnimatedStyle(() => ({
    opacity: edge.get(),
    transform: [{ translateY: (1 - edge.get()) * 6 }],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[{ alignItems: 'center' }, anim]}
    >
      <Txt variant="title" numberOfLines={1}>
        {title}
      </Txt>
    </Animated.View>
  );
}
