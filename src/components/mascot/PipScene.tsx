import { useEffect } from 'react';
import { View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import Animated, {
  useSharedValue, useAnimatedStyle, withRepeat, withSequence, withTiming,
  withSpring, withDelay, useReducedMotion, Easing,
} from 'react-native-reanimated';
import { Pip, type PipPose } from './Pip';
import { Txt } from '../Txt';
import { EASE } from '../Press';
import { useTheme } from '../../theme/useTheme';
import { radius, space, TINTS, motion } from '../../theme/tokens';

/**
 * Pip, moving.
 *
 * The art in `Pip.tsx` is deliberately inert. Everything here is a `transform`
 * or an `opacity` on a wrapping view, which the animate-expo gate calls free:
 * no layout pass, no animated SVG props, nothing crossing to the RN runtime
 * once it has started.
 *
 * WHERE PIP IS ALLOWED TO MOVE is decided by DESIGN.md's frequency gate, not by
 * where he would be cute:
 *
 *   Rare / first-run      welcome, ready, focus-complete   full delight budget
 *   Occasional            empty states                     a slow idle, nothing more
 *   Tens of times a day   task rows, tab bar, headers      NOTHING. He is absent.
 *
 * That last row is the important one. A mascot on a FlashList row would replay
 * its entrance on every recycle, and a mascot in chrome is a thing you are made
 * to watch dozens of times a day until you resent it. Pip appears where the app
 * is otherwise empty or finished — the two moments that can afford him.
 *
 * He is also absent from the Focus screen while a timer runs. That screen's only
 * ambient motion is the halo, and it is the one screen you are meant to stop
 * looking at; a moving character there would be working against the product.
 * He shows up when the session ENDS.
 */

type Idle =
  /** A slow breath. The empty-state default. */
  | 'breathe'
  /** A gentle float, for a Pip that is not sitting on anything. */
  | 'bob'
  /** Perfectly still. */
  | 'none';

export function PipScene({
  pose = 'sit',
  size = 180,
  idle = 'breathe',
  grounded = true,
  /** Delay before the entrance, to stagger Pip against the copy beside him. */
  delay = 0,
}: {
  pose?: PipPose;
  size?: number;
  idle?: Idle;
  grounded?: boolean;
  delay?: number;
}) {
  const reduced = useReducedMotion();

  /** Entrance and idle are separate values so the loop cannot fight the arrival. */
  const enter = useSharedValue(0);
  const loop = useSharedValue(0);
  /** One-shot celebration, only ever driven by the `cheer` pose. */
  const pop = useSharedValue(0);

  useEffect(() => {
    if (reduced) {
      // Reduce Motion collapses spatial motion to a CROSS-FADE rather than to
      // nothing — the app-wide rule in DESIGN.md. `enter` still runs 0 to 1, but
      // the style below spends it entirely on opacity and drops the travel and
      // the scale, so Pip fades up in place instead of popping into existence.
      enter.set(withDelay(delay, withTiming(1, { duration: motion.enter })));
      return;
    }
    // A spring, because Pip should land rather than stop. `dampingRatio` 0.68
    // gives one visible overshoot — the bounce is the character, and this is
    // the rare tier where that is affordable.
    enter.set(withDelay(delay, withSpring(1, { duration: 620, dampingRatio: 0.68 })));
  }, [reduced, delay, enter]);

  useEffect(() => {
    if (reduced || idle === 'none') return;
    // 3.8s each way. Deliberately slower than a resting breath, for the same
    // reason the focus halo is: at anything near human tempo it stops being
    // ambient and becomes something to watch.
    const period = idle === 'breathe' ? 3800 : 2600;
    loop.set(
      withRepeat(
        withSequence(
          withTiming(1, { duration: period, easing: Easing.inOut(Easing.quad) }),
          withTiming(0, { duration: period, easing: Easing.inOut(Easing.quad) })
        ),
        -1,
        false
      )
    );
  }, [reduced, idle, loop]);

  useEffect(() => {
    if (reduced || pose !== 'cheer') return;
    // Squash, stretch, settle. The classic three beats — it reads as effort
    // rather than as a view being scaled, which is the whole difference.
    pop.set(
      withDelay(
        delay + 160,
        withSequence(
          withTiming(-1, { duration: 120, easing: EASE }),
          withTiming(1, { duration: 200, easing: EASE }),
          withSpring(0, motion.settle)
        )
      )
    );
  }, [reduced, pose, delay, pop]);

  const anim = useAnimatedStyle(() => {
    const e = enter.get();
    const l = loop.get();
    const p = pop.get();

    if (reduced) return { opacity: e, transform: [] };

    // Never scale from 0 — nothing in the real world appears from nothing.
    const entryScale = 0.86 + 0.14 * e;
    const breath = idle === 'breathe' ? 1 + 0.018 * l : 1;
    const lift = idle === 'bob' ? -7 * l : 0;

    return {
      opacity: e,
      transform: [
        { translateY: (1 - e) * 22 + lift + (p > 0 ? -10 * p : 0) },
        { scaleX: entryScale * breath * (1 - 0.07 * p) },
        { scaleY: entryScale * breath * (1 + 0.09 * p) },
      ],
    };
  });

  return (
    <Animated.View style={anim}>
      <Pip size={size} pose={pose} grounded={grounded} />
    </Animated.View>
  );
}

/* ------------------------------------------------------------- accessories */

/**
 * The three radiating lines beside Pip's phone.
 *
 * They pulse rather than sit still because the subject of that screen is a
 * notification arriving, and a static glyph of a notification is just a shape.
 * The motion is the meaning here, which is the one justification that earns a
 * loop on an onboarding screen.
 */
export function NotifyLines({ size = 44 }: { size?: number }) {
  const { c } = useTheme();
  const reduced = useReducedMotion();
  const pulse = useSharedValue(0);

  useEffect(() => {
    if (reduced) return;
    pulse.set(
      withRepeat(
        withSequence(
          withTiming(1, { duration: 900, easing: Easing.out(Easing.quad) }),
          withTiming(0, { duration: 900, easing: Easing.in(Easing.quad) }),
          withTiming(0, { duration: 700 })
        ),
        -1,
        false
      )
    );
  }, [reduced, pulse]);

  const anim = useAnimatedStyle(() => ({
    opacity: reduced ? 0.9 : 0.35 + 0.65 * pulse.get(),
    transform: [{ scale: reduced ? 1 : 0.86 + 0.14 * pulse.get() }],
  }));

  return (
    <Animated.View style={anim} pointerEvents="none">
      <Svg width={size} height={size} viewBox="0 0 44 44">
        {[
          'M 8,12 L 20,7',
          'M 11,22 L 24,22',
          'M 8,32 L 20,37',
        ].map((d) => (
          <Path key={d} d={d} stroke={c.accent} strokeWidth={5} strokeLinecap="round" />
        ))}
      </Svg>
    </Animated.View>
  );
}

/**
 * Pip's speech bubble.
 *
 * Taken from Finch rather than from Duolingo: for a planner aimed at people who
 * struggle to start, a character who SAYS something reassuring lands differently
 * from a headline that congratulates you. The copy belongs to the character, so
 * it is set in the UI sans at caption weight — putting it in the display serif
 * would make it the screen's headline, and a screen gets one of those.
 */
export function PipBubble({ text, delay = 0 }: { text: string; delay?: number }) {
  const { c, shadow } = useTheme();
  const reduced = useReducedMotion();
  const v = useSharedValue(0);

  useEffect(() => {
    // Same cross-fade rule as PipScene: under Reduce Motion the bubble fades in
    // where it stands rather than rising and scaling into place.
    if (reduced) { v.set(withDelay(delay, withTiming(1, { duration: motion.enter }))); return; }
    v.set(withDelay(delay, withSpring(1, { duration: 460, dampingRatio: 0.7 })));
  }, [reduced, delay, v]);

  const anim = useAnimatedStyle(() => {
    if (reduced) return { opacity: v.get(), transform: [] };
    return {
      opacity: v.get(),
      transform: [
        { translateY: (1 - v.get()) * 8 },
        { scale: 0.92 + 0.08 * v.get() },
      ],
    };
  });

  return (
    <Animated.View
      style={[
        {
          alignSelf: 'center',
          paddingVertical: space.sm,
          paddingHorizontal: space.base,
          borderRadius: radius.pill,
          backgroundColor: c.surface,
          boxShadow: shadow[1],
          maxWidth: 300,
        },
        anim,
      ]}
    >
      <Txt variant="captionStrong" tone="muted" style={{ textAlign: 'center' }}>
        {text}
      </Txt>
    </Animated.View>
  );
}

/**
 * A confetti burst.
 *
 * The pieces are painted from `TINTS` — the same six hues that encode a task's
 * identity everywhere else — so the celebration is visibly made of the user's
 * own day rather than of generic party colours.
 *
 * Fixed, hand-picked pieces rather than `Math.random()`: a random burst has to
 * be re-rolled until it happens to look balanced, and it will look different in
 * every screenshot and every test run. Twelve is enough to read as a burst and
 * few enough that twelve simultaneous transforms cost nothing.
 */
const PIECES = [
  { x: -108, r: -40, tint: 'rose' as const, d: 0, s: 1.0 },
  { x: -84, r: 25, tint: 'butter' as const, d: 60, s: 0.8 },
  { x: -62, r: -70, tint: 'mint' as const, d: 20, s: 1.1 },
  { x: -38, r: 40, tint: 'sky' as const, d: 120, s: 0.9 },
  { x: -16, r: -20, tint: 'lilac' as const, d: 40, s: 1.0 },
  { x: 4, r: 60, tint: 'peach' as const, d: 100, s: 0.85 },
  { x: 24, r: -55, tint: 'rose' as const, d: 10, s: 1.05 },
  { x: 46, r: 30, tint: 'mint' as const, d: 90, s: 0.9 },
  { x: 68, r: -35, tint: 'butter' as const, d: 50, s: 1.0 },
  { x: 90, r: 50, tint: 'sky' as const, d: 140, s: 0.8 },
  { x: 112, r: -25, tint: 'lilac' as const, d: 30, s: 1.1 },
  { x: 132, r: 45, tint: 'peach' as const, d: 110, s: 0.95 },
];

export function Confetti({ height = 260 }: { height?: number }) {
  const reduced = useReducedMotion();
  // Reduce Motion removes this outright rather than cross-fading it. A burst of
  // falling debris has no still frame worth showing, and its entire content is
  // the movement the setting exists to suppress.
  if (reduced) return null;

  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: 0, height, left: 0, right: 0 }}>
      {PIECES.map((p) => (
        <Piece key={`${p.x}-${p.tint}`} piece={p} height={height} />
      ))}
    </View>
  );
}

function Piece({ piece, height }: { piece: (typeof PIECES)[number]; height: number }) {
  const { isDark } = useTheme();
  const t = useSharedValue(0);

  useEffect(() => {
    t.set(withDelay(piece.d, withTiming(1, { duration: 2200, easing: Easing.out(Easing.quad) })));
  }, [t, piece.d]);

  const anim = useAnimatedStyle(() => {
    const v = t.get();
    return {
      // Out and up first, then down past the bottom — a burst, not a drizzle.
      opacity: v < 0.08 ? v / 0.08 : v > 0.75 ? (1 - v) / 0.25 : 1,
      transform: [
        { translateX: piece.x * Math.min(1, v * 2.2) },
        { translateY: -70 * Math.sin(Math.PI * Math.min(1, v * 1.3)) + height * v },
        { rotate: `${piece.r * v * 4}deg` },
        { scale: piece.s },
      ],
    };
  });

  const color = TINTS[piece.tint][isDark ? 'dark' : 'light'].bg;

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          top: 24,
          left: '50%',
          width: 9,
          height: 13,
          borderRadius: 2,
          backgroundColor: color,
        },
        anim,
      ]}
    />
  );
}
