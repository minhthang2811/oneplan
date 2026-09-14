import { useEffect } from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, useAnimatedProps, withSpring, withTiming,
  withDelay, withSequence, runOnJS, useReducedMotion, Easing, interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import { Pip } from './mascot/Pip';
import { Txt } from './Txt';
import { EASE } from './Press';
import { useTheme } from '../theme/useTheme';
import { motion, TINTS, type TintName } from '../theme/tokens';

/**
 * The animated launch screen.
 *
 * ── THE HANDOFF ────────────────────────────────────────────────────────────
 * A custom launch animation in React Native is really TWO screens pretending
 * to be one. The first is drawn by the OS from `app.json` before any JavaScript
 * exists; the second is this component. The only thing that makes the seam
 * invisible is that frame one of this file is pixel-identical to the native
 * splash: the same artwork (`assets/splash-pip.png` is a render of the same
 * `pip-sit` file this renders), at the same `PIP_REST` = 140pt that
 * `imageWidth: 140` gives it, dead centre, on the same `canvas`.
 *
 * Get any of those three wrong and the launch has a visible cut in it, which
 * costs more than the animation buys. That constraint is why Pip starts at rest
 * and *wakes up* rather than flying in from off-screen — there is nowhere to
 * fly in from when your first frame is already on screen.
 *
 * ── THE BEATS ──────────────────────────────────────────────────────────────
 *   1. WAKE      Pip settles on a loose spring — squash, rise, overshoot. The
 *                wordmark rises under him. The tinted discs bloom outward.
 *   2. HOLD      One still frame. A launch with no still frame reads as a
 *                stutter, because the eye never gets to land on the brand.
 *   3. REVEAL    An iris opens from Pip's own centre, wiping the tinted launch
 *                ground away to the app's plain canvas underneath, while Pip
 *                and the wordmark scale up through the viewer and fade.
 *
 * The reveal is an EXPANDING HOLE, not a fade. A fade puts the app and the
 * splash on screen at once at 50% each, which is the one frame where both look
 * broken. A hole means the app is only ever shown at full strength — it is
 * simply shown in more and more of the screen — so there is no in-between state
 * to get wrong.
 *
 * The hole is A RING WITH AN ENORMOUS STROKE, not a mask. `borderRadius` gives
 * you a disc and never its inverse, and an SVG `Mask` does give you the inverse
 * — at the price of re-rasterising a full-screen mask bitmap on every frame of
 * the reveal, which on a 3x phone is a 1320x2868 buffer sixty times a second.
 * A circle with `fill="none"` and a stroke wider than the screen is the same
 * shape for the cost of one stroked path: the stroke straddles the path, so
 * placing the path at `r + W/2` makes the painted band run from exactly `r`
 * outward, and the untouched middle IS the hole. Growing `r` opens it.
 *
 * ── WHY PIP IS ALLOWED HERE AT ALL ─────────────────────────────────────────
 * DESIGN.md's frequency gate bans the mascot from anything seen tens of times a
 * day. A launch screen is seen on cold start only, and it is the definition of
 * a rare, first-impression moment, so it sits in the same tier as `welcome` and
 * `focus-complete`: full delight budget.
 */

/** Matches `imageWidth: 140` in the expo-splash-screen plugin config. */
const PIP_REST = 140;
/** What he grows to once awake. Small enough that the wake reads as a breath. */
const PIP_AWAKE = 176;

/**
 * The bloom. Hand-placed rather than random, and painted from `TINTS` — the
 * same six hues that encode a task's identity everywhere else — so the launch
 * is visibly made of the app's own material instead of generic party colour.
 *
 * `a` is the angle Pip flings each disc along, in radians; `d` the distance it
 * travels as a fraction of the layout radius; `t` when it leaves, as a fraction
 * of the wake.
 */
const DISCS: { tint: TintName; size: number; a: number; d: number; t: number }[] = [
  { tint: 'lilac',  size: 30, a: -1.94, d: 1.00, t: 0.00 },
  { tint: 'peach',  size: 20, a: -1.10, d: 0.86, t: 0.10 },
  { tint: 'mint',   size: 24, a: -0.28, d: 1.06, t: 0.05 },
  { tint: 'butter', size: 16, a: 0.46,  d: 0.80, t: 0.18 },
  { tint: 'sky',    size: 22, a: 1.28,  d: 1.02, t: 0.08 },
  { tint: 'rose',   size: 18, a: 2.16,  d: 0.90, t: 0.14 },
  { tint: 'lilac',  size: 13, a: 2.86,  d: 0.74, t: 0.22 },
  { tint: 'mint',   size: 11, a: -2.62, d: 0.82, t: 0.16 },
];

/** How far out the discs settle, from Pip's centre. */
const BLOOM_RADIUS = 132;

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export function LaunchScreen({ onFinish }: { onFinish: () => void }) {
  const { c, isDark } = useTheme();
  const reduced = useReducedMotion();
  const { width, height } = useWindowDimensions();

  /** 0 → 1 across beat 1. Drives Pip, the wordmark and the bloom. */
  const wake = useSharedValue(0);
  /** 0 → 1 across beat 3. Drives the iris and the exit. */
  const out = useSharedValue(0);

  /**
   * The iris has to clear the FURTHEST CORNER, not the edge. Pip sits at the
   * centre, so that is half the diagonal — and a little over, because a mask
   * edge that stops exactly at the corner leaves a one-pixel arc of launch
   * ground behind on the last frame.
   */
  const irisMax = Math.hypot(width, height) / 2 + 8;
  /**
   * The ring's stroke width. Anything at least as wide as the screen's diagonal
   * guarantees the painted band still reaches every corner when the hole is at
   * its widest, so the cover can never thin out into a visible ring.
   */
  const irisBand = Math.hypot(width, height) * 1.2;

  useEffect(() => {
    const handOver = (done?: boolean) => {
      'worklet';
      if (done) runOnJS(onFinish)();
    };

    if (reduced) {
      /**
       * Reduce Motion gets the app, not a performance: hold the identical frame
       * just long enough not to flash, then cross-fade. The app-wide rule is
       * that spatial motion collapses to a cross-fade, and an iris IS spatial
       * motion — it is a shape travelling across the screen.
       */
      wake.set(withDelay(motion.launch.handoff, withTiming(1, { duration: motion.enter })));
      out.set(
        withDelay(
          motion.launch.handoff + motion.enter + motion.launch.hold,
          withTiming(1, { duration: motion.enter }, handOver)
        )
      );
    } else {
      // Nothing moves until the native splash has finished fading off the top
      // of us — see `motion.launch.handoff`.
      wake.set(withDelay(motion.launch.handoff, withSpring(1, motion.launch.wake)));
      out.set(
        withDelay(
          motion.launch.handoff + motion.launch.wake.duration + motion.launch.hold,
          withTiming(
            1,
            // Ease-IN-out, unusually. The iris is the one thing here that
            // should start slowly: a reveal that leaps off the mark reads as
            // the splash being yanked away rather than opening.
            { duration: motion.launch.reveal, easing: Easing.inOut(Easing.cubic) },
            handOver
          )
        )
      );
    }

    /**
     * THE DEADMAN SWITCH.
     *
     * Both paths above hand over from an animation callback guarded by
     * `if (done)`, which is right for a completed animation and SILENT for a
     * cancelled one. A cancelled reveal that never restarts would leave this
     * overlay mounted forever — and because it is `pointerEvents="none"` and
     * hidden from assistive technology, the app underneath would stay mounted,
     * stay tappable, and keep satisfying every assertion in the e2e suite while
     * the user sat looking at a mascot. That is the worst failure this
     * component has, so it must not rest on the animation being uninterrupted.
     *
     * `reduced` comes from `useReducedMotion()` and can flip mid-launch if the
     * user toggles the setting, which re-runs this effect and cancels whatever
     * was in flight. The timer is cleared and re-armed on that path, so it only
     * ever fires when nothing else did, and `onFinish` is idempotent anyway.
     */
    const overrun =
      motion.launch.handoff +
      motion.launch.wake.duration +
      motion.launch.hold +
      motion.launch.reveal +
      1500;
    const deadman = setTimeout(onFinish, overrun);
    return () => clearTimeout(deadman);
  }, [reduced, wake, out, onFinish]);

  /**
   * PIP.
   *
   * On the way in: squash at the feet, rise, overshoot, settle — the spring's
   * own overshoot does the work, so `wake` can pass 1 and the scale follows it
   * past full size without any extra keyframes.
   *
   * On the way out: he scales UP and fades, so he reads as passing the viewer
   * rather than as shrinking into the distance. Shrinking would say "going
   * away"; the app is what is arriving, and he should get out of its way
   * towards us.
   */
  const pipStyle = useAnimatedStyle(() => {
    const w = wake.get();
    const o = out.get();

    if (reduced) return { opacity: (1 - o) * w + (1 - w) * 1, transform: [] };

    const grow = PIP_REST + (PIP_AWAKE - PIP_REST) * Math.min(w, 1);
    const scale = (grow / PIP_REST) * (1 + 0.22 * o);
    // Anti-phase squash: wide and short at the start of the rise, then over-tall
    // at the peak. This is the difference between a view being scaled and a
    // character taking a breath.
    const squash = interpolate(w, [0, 0.35, 1], [0.06, -0.04, 0], Extrapolation.CLAMP);

    return {
      opacity: 1 - o,
      transform: [
        { translateY: interpolate(w, [0, 1], [10, 0], Extrapolation.CLAMP) - 24 * o },
        { scaleX: scale * (1 + squash) },
        { scaleY: scale * (1 - squash) },
      ],
    };
  });

  /**
   * The wordmark. It is NOT on the native splash — the native side is Pip
   * alone — so this is the one element that may legitimately arrive from
   * nowhere, and it is what tells you the animation has begun.
   */
  const markStyle = useAnimatedStyle(() => {
    const w = interpolate(wake.get(), [0.25, 1], [0, 1], Extrapolation.CLAMP);
    const o = out.get();
    if (reduced) return { opacity: w * (1 - o), transform: [] };
    return {
      opacity: w * (1 - o),
      transform: [{ translateY: (1 - w) * 14 + 10 * o }],
    };
  });

  /**
   * The ring's own radius: the hole's radius plus half the band, so the inner
   * edge of the stroke sits exactly on the hole. One number crossing to the UI
   * thread per frame, on a single path.
   */
  const irisProps = useAnimatedProps(() => ({
    // Under Reduce Motion the hole never opens — the whole layer cross-fades
    // away instead (see `irisStyle`), so the ring must stay shut or the two
    // would play at once.
    r:
      (reduced ? 0 : interpolate(out.get(), [0, 1], [0, irisMax], Extrapolation.CLAMP)) +
      irisBand / 2,
  }));

  const irisStyle = useAnimatedStyle(() => {
    // Under Reduce Motion the mask never opens, so the whole opaque layer has to
    // cross-fade away instead.
    if (reduced) return { opacity: 1 - out.get(), transform: [] };
    return {
      opacity: 1,
      /**
       * The launch ground rushes PAST the camera as the hole opens, instead of
       * sitting still while a hole is cut in it. This is the cheapest possible
       * depth cue and it is why the reveal reads as moving into the app rather
       * than as the splash being erased.
       *
       * It costs nothing that the canvas-coloured rect over-covers the screen
       * once scaled — it is the same colour as what is behind it.
       */
      transform: [{ scale: 1 + 0.14 * out.get() }],
    };
  });

  return (
    <View
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
      /*
       * The only handle the e2e suite has on this overlay.
       *
       * Everything visible here is decorative and hidden from assistive
       * technology, and the overlay does not block touches — so if it ever
       * failed to unmount, the app underneath would still be mounted, still
       * respond to taps, and still satisfy every hierarchy assertion, while
       * being completely invisible to the user. That is the worst failure mode
       * in this component and nothing else can catch it.
       *
       * `testID` becomes `accessibilityIdentifier` on iOS, which XCUITest (and
       * therefore Maestro) can see but VoiceOver does NOT announce — so this
       * buys the guard without making the decoration speak. See
       * `.maestro/07-launch-handoff.yaml`.
       */
      testID="launch-overlay"
    >
      {/* 1. THE OPAQUE LAYER. Everything above this is what the iris cuts
             through; the app sits underneath it. */}
      <Animated.View style={[StyleSheet.absoluteFill, irisStyle]}>
        <Svg width={width} height={height}>
          <Defs>
            {/*
              The launch ground. A radial wash rather than a flat fill: flat
              reads as a different app, a wash reads as the same canvas, lit.
              Its outer stop IS `canvas`, so the tint simply stops existing as
              the hole grows past it — no separate fade to keep in step.

              `userSpaceOnUse` because the shape being painted is a ring wider
              than the screen; in the default bounding-box units the gradient
              would be stretched across that ring's enormous box and the wash
              would never be seen at all.
            */}
            <RadialGradient
              id="wash"
              gradientUnits="userSpaceOnUse"
              cx={width / 2}
              cy={height * 0.46}
              r={height * 0.72}
            >
              <Stop offset="0" stopColor={c.canvasTinted} stopOpacity={isDark ? 0.92 : 1} />
              <Stop offset="1" stopColor={c.canvas} stopOpacity={1} />
            </RadialGradient>
          </Defs>

          <AnimatedCircle
            cx={width / 2}
            cy={height / 2}
            fill="none"
            stroke="url(#wash)"
            strokeWidth={irisBand}
            animatedProps={irisProps}
          />
        </Svg>
      </Animated.View>

      {/* 2. THE BLOOM, behind Pip. */}
      <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
        {DISCS.map((d, i) => (
          <Disc key={`${d.tint}-${i}`} disc={d} wake={wake} out={out} reduced={reduced} />
        ))}
      </View>

      {/* 3. PIP AND THE WORDMARK, above everything. The wordmark is positioned
             absolutely below centre so that adding it does not shift Pip off
             the exact centre the native splash put him on. */}
      <View
        style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}
        accessible={false}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <Animated.View style={pipStyle}>
          <Pip size={PIP_REST} image="sit" />
        </Animated.View>

        <Animated.View
          style={[
            { position: 'absolute', top: '50%', marginTop: PIP_AWAKE / 2 + 4, alignItems: 'center' },
            markStyle,
          ]}
        >
          <Txt variant="displayMd" allowFontScaling={false} style={{ letterSpacing: 0.2 }}>
            Oneplan
          </Txt>
        </Animated.View>
      </View>
    </View>
  );
}

/**
 * One disc of the bloom.
 *
 * Each starts at Pip's centre at zero size and is flung out along its own angle
 * — so the bloom reads as coming OUT of him, which is the only reason a mascot
 * and an abstract brand mark can share a screen without competing.
 */
function Disc({
  disc, wake, out, reduced,
}: {
  disc: (typeof DISCS)[number];
  wake: ReturnType<typeof useSharedValue<number>>;
  out: ReturnType<typeof useSharedValue<number>>;
  reduced: boolean;
}) {
  const { isDark } = useTheme();
  const color = TINTS[disc.tint][isDark ? 'dark' : 'light'].bg;

  const anim = useAnimatedStyle(() => {
    // Each disc reads the SHARED wake value through its own offset window, so
    // the eight of them stagger without eight timers.
    const w = interpolate(wake.get(), [disc.t, 1], [0, 1], Extrapolation.CLAMP);
    const o = out.get();

    if (reduced) return { opacity: 0 };

    const travel = BLOOM_RADIUS * disc.d * w;
    // They keep going on the way out, as if the iris pushed them.
    const fling = travel + 56 * o;

    return {
      opacity: Math.min(w * 1.6, 1) * (1 - Math.min(o * 1.9, 1)),
      transform: [
        { translateX: Math.cos(disc.a) * fling },
        { translateY: Math.sin(disc.a) * fling },
        { scale: w * (1 - 0.3 * o) },
      ],
    };
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          width: disc.size,
          height: disc.size,
          borderRadius: disc.size / 2,
          backgroundColor: color,
        },
        anim,
      ]}
    />
  );
}
