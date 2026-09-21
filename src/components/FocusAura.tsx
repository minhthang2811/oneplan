import { useCallback, useEffect, useId, useMemo, useState } from 'react';
import { View, useWindowDimensions } from 'react-native';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import Animated, {
  useSharedValue, useAnimatedStyle, withRepeat, withSequence, withTiming,
  cancelAnimation, useReducedMotion, Easing,
} from 'react-native-reanimated';
import { useFocusEffect } from 'expo-router';
import { useTheme } from '../theme/useTheme';
import type { TintName } from '../theme/tokens';

/**
 * The ambient ground behind Focus.
 *
 * ── Why the screen needed one ──────────────────────────────────────────────
 * Focus was a flat wash of `canvasTinted`. Flat is the right instinct for a
 * screen you are meant to stop looking at, but a flat *fill* reads as an unset
 * screen rather than as a calm one — and Focus is the app's one full-screen
 * moment, the only place with nothing else competing for the ground.
 *
 * The reference class (Tiimo, Waking Up, Oura, Forest) is unanimous that this
 * screen carries atmosphere rather than chrome. Waking Up in particular is a
 * slow mesh gradient with nothing else on it at all. What was taken is that
 * idea — a soft field of light with no edges — not its palette.
 *
 * ── Why it is made of the TASK's colour ────────────────────────────────────
 * The design contract reserves `TINTS` for data: an activity's tint is its
 * identity, and the palette is never decoration. An arbitrary decorative
 * gradient here would break that rule for no reason.
 *
 * So the field is built from exactly two hues, both of which already mean
 * something: the tint of the activity being focused on, and the single accent.
 * Starting a session on "Lunch" turns the room the colour of Lunch. With no
 * activity attached there is no identity to show, so all three blooms fall back
 * to the accent and the screen goes quietly monochrome — which is the honest
 * rendering of "this session is not about anything in particular".
 *
 * ── Why they are radial gradients and not discs ────────────────────────────
 * Same reason as `Halo`: a flat circle at any opacity you can notice has an
 * EDGE, and an edge is an object. Only a gradient with no edge reads as light.
 *
 * ── Motion ─────────────────────────────────────────────────────────────────
 * Each bloom drifts on its own period (17s, 21s, 26s), chosen to be mutually
 * prime-ish so the composition never visibly loops. That is far slower than
 * anything else in the app on purpose — at this speed it is not an animation
 * you watch, it is a room that is not quite still. Under Reduce Motion the
 * blooms are painted once and never move.
 */

type Bloom = {
  /** Centre, as a fraction of the screen. */
  x: number;
  y: number;
  /** Diameter, as a fraction of screen WIDTH — so it scales with the device. */
  size: number;
  /** Peak opacity multiplier, before the theme and `intensity` are applied. */
  weight: number;
  /** Seconds for one full out-and-back drift. */
  period: number;
  /** Drift distance in points. */
  travel: number;
  /** `primary` is the activity's own tint; `accent` is the app accent. */
  hue: 'primary' | 'accent';
};

const BLOOMS: Bloom[] = [
  { x: 0.18, y: 0.16, size: 1.15, weight: 1.0, period: 17, travel: 26, hue: 'primary' },
  { x: 0.92, y: 0.52, size: 1.0, weight: 0.8, period: 21, travel: 32, hue: 'accent' },
  { x: 0.42, y: 0.92, size: 0.9, weight: 0.62, period: 26, travel: 22, hue: 'primary' },
];

export function FocusAura({
  tint,
  intensity = 1,
}: {
  /** The focused activity's tint. `null` when the session has no activity. */
  tint: TintName | null;
  /** 0–1. Dropped while the picker is up so the dial stays the brightest thing. */
  intensity?: number;
}) {
  const { width, height } = useWindowDimensions();
  const theme = useTheme();
  const { c, isDark } = theme;

  /**
   * The drift stops while Focus is not the visible tab.
   *
   * Expo Router keeps every tab screen mounted, so a `withRepeat(-1)` started
   * here runs for the life of the app unless something stops it — three of
   * them, driving transforms on the UI thread behind whatever the user is
   * actually looking at. `PupuScene` gates its idle loop on navigation focus and
   * `Halo` on its `active` prop; this is the same rule.
   *
   * Starts FALSE: Today is the launch tab, so this screen mounts unfocused, and
   * a `true` default would start all three loops behind it at app start — the
   * very thing being fixed. `useFocusEffect` turns them on when Focus is opened.
   */
  const [focused, setFocused] = useState(false);
  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => setFocused(false);
    }, [])
  );

  /**
   * Gradient ids live in a process-wide registry in react-native-svg, so they
   * have to be unique per instance — the convention `Gel.tsx` established.
   */
  const uid = useId().replace(/:/g, '');

  /**
   * In LIGHT the bloom is the tint's `bg` — the pastel — because the canvas is
   * already near-white and there is nowhere brighter to go; colour has to
   * arrive as pigment.
   *
   * In DARK it is the `fg` — the light pastel meant for text — at a much lower
   * opacity. The dark `bg` values are deep and desaturated (they are built to
   * sit *behind* text), and a bloom made of them on a near-black canvas is mud
   * rather than light. This inversion is the whole reason the two themes do not
   * share one number.
   */
  const hues = useMemo(() => {
    const swatch = tint ? theme.tint(tint) : null;
    const primary = swatch ? (isDark ? swatch.fg : swatch.bg) : c.accent;
    return { primary, accent: c.accent };
  }, [tint, theme, isDark, c.accent]);

  /**
   * ── THE LIGHT SET CAME DOWN WHEN THE SCREEN GAINED SCENERY ───────────────
   * This field used to be the ONLY thing on the ground, and it was painted
   * strongly enough to carry that on its own. `BotanicalBackdrop` now does the
   * work of making the screen a place, and two full-strength layers of
   * atmosphere is one too many: at 0.5 the accent bloom washed the foliage out
   * to grey-lilac and the forest read as a stain rather than as a wood. The
   * aura's job here is to TINT the room the colour of the activity, which it
   * does perfectly well at two thirds of the weight.
   *
   * Dark is unchanged. It was never competing with anything — on a near-black
   * canvas the foliage separates by value and the bloom by hue.
   */
  const base = isDark ? 0.15 : 0.34;

  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
      {BLOOMS.map((b, i) => (
        <Drift
          key={i}
          bloom={b}
          id={`aura${i}${uid}`}
          color={hues[b.hue]}
          opacity={base * b.weight * intensity}
          screenW={width}
          screenH={height}
          drifting={focused}
        />
      ))}
    </View>
  );
}

function Drift({
  bloom, id, color, opacity, screenW, screenH, drifting,
}: {
  bloom: Bloom;
  id: string;
  color: string;
  opacity: number;
  screenW: number;
  screenH: number;
  /** False while the screen is not focused — see `FocusAura`. */
  drifting: boolean;
}) {
  const reduced = useReducedMotion();
  const phase = useSharedValue(0);

  useEffect(() => {
    if (!drifting || reduced) {
      cancelAnimation(phase);
      return;
    }
    const half = (bloom.period * 1000) / 2;
    phase.set(
      withRepeat(
        withSequence(
          withTiming(1, { duration: half, easing: Easing.inOut(Easing.sin) }),
          withTiming(0, { duration: half, easing: Easing.inOut(Easing.sin) })
        ),
        -1,
        false
      )
    );
    // Unmounting mid-loop leaves the animation running against a freed value
    // otherwise; `withRepeat(-1)` has no natural end to clean itself up on.
    return () => cancelAnimation(phase);
  }, [phase, reduced, drifting, bloom.period]);

  const d = screenW * bloom.size;

  /**
   * The drift is diagonal and the scale breathes with it, because a bloom that
   * only slides reads as a sprite being moved. Light that swells slightly as it
   * travels reads as light.
   */
  const anim = useAnimatedStyle(() => {
    const p = phase.get();
    return {
      transform: [
        { translateX: (p - 0.5) * bloom.travel },
        { translateY: (0.5 - p) * bloom.travel * 0.7 },
        { scale: 1 + 0.06 * p },
      ],
    };
  });

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: screenW * bloom.x - d / 2,
          top: screenH * bloom.y - d / 2,
          width: d,
          height: d,
        },
        anim,
      ]}
    >
      <Svg width={d} height={d}>
        <Defs>
          <RadialGradient id={id} cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={color} stopOpacity={opacity} />
            {/*
              The midpoint is pulled IN to 0.45 rather than left at the linear
              0.5. A straight ramp from centre to edge puts most of the colour
              in the outer ring, where the circles overlap each other, and three
              of those stack into a visible grey halo. Front-loading the falloff
              keeps each bloom's mass near its own centre.
            */}
            <Stop offset="0.45" stopColor={color} stopOpacity={opacity * 0.42} />
            <Stop offset="1" stopColor={color} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx={d / 2} cy={d / 2} r={d / 2} fill={`url(#${id})`} />
      </Svg>
    </Animated.View>
  );
}
