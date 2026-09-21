import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import Animated, {
  useSharedValue, useAnimatedStyle, withRepeat, withSequence, withTiming,
  withSpring, withDelay, cancelAnimation, useReducedMotion, Easing,
} from 'react-native-reanimated';
import { Pupu, type PupuImage } from './Pupu';
import { Txt } from '../Txt';
import { EASE } from '../Press';
import { useTheme } from '../../theme/useTheme';
import { radius, space, TINTS, motion } from '../../theme/tokens';

/**
 * Pupu, moving.
 *
 * The art in `Pupu.tsx` is deliberately inert. Everything here is a `transform`
 * or an `opacity` on a wrapping view, which the animate-expo gate calls free:
 * no layout pass, nothing crossing to the RN runtime once it has started.
 *
 * THERE ARE THREE PICTURES AND FOUR POSES, so motion still does some of the
 * work a fourth drawing would otherwise do — `rest` is the sitting artwork
 * breathing slowly, and that is the right way to say "dozing" without a
 * separate file. `cheer` is NOT one of those any more: it has its own drawing,
 * because a celebration is carried by the character's face and paws and no
 * amount of squash-and-stretch on a calm sitting dog supplies either.
 *
 * WHERE PUPU IS ALLOWED TO MOVE is decided by DESIGN.md's frequency gate, not by
 * where he would be cute:
 *
 *   Rare / first-run      welcome, ready, focus-complete   full delight budget
 *   Occasional            empty states                     a slow idle, nothing more
 *   Tens of times a day   task rows, tab bar, headers      NOTHING. He is absent.
 *
 * That last row is the important one. A mascot on a FlashList row would replay
 * its entrance on every recycle, and a mascot in chrome is a thing you are made
 * to watch dozens of times a day until you resent it. Pupu appears where the app
 * is otherwise empty or finished — the two moments that can afford him.
 *
 * He is also absent from the Focus screen while a timer runs. That screen's only
 * ambient motion is the halo, and it is the one screen you are meant to stop
 * looking at; a moving character there would be working against the product.
 * He shows up when the session ENDS.
 */

/**
 * A pose is an INTENT. It picks one of the two images and a way of moving.
 */
export type PupuPose = 'sit' | 'phone' | 'cheer' | 'rest';

const POSE_IMAGE: Record<PupuPose, PupuImage> = {
  sit: 'sit',
  phone: 'phone',
  cheer: 'cheer',
  // Dozing is still the sitting picture slowed right down. That one genuinely
  // is a behaviour rather than a drawing — a sleeping dog and a sitting dog
  // differ by how much they move, which is exactly what `idle` controls.
  rest: 'sit',
};

type Idle =
  /** A slow breath. The empty-state default. */
  | 'breathe'
  /** A gentle float, for a Pupu that is not sitting on anything. */
  | 'bob'
  /**
   * Breathing, plus a slow shift of weight from one side to the other.
   *
   * ── WHERE THIS IS ALLOWED, AND WHY IT IS ONLY THERE ──────────────────────
   * The welcome screen, and nowhere else. It is the most alive Pupu ever looks
   * while merely waiting, and by the frequency gate that is affordable exactly
   * once: the first screen of the first run, which a user sees one time and
   * where the whole job of the picture is to say "there is somebody here".
   *
   * `breathe` alone does not do that job. A 1.8% scale is a dog that is
   * BREATHING, which is the right note for an empty day — present, not doing
   * anything — and on a welcome screen it reads as a still image that happens
   * to be very slightly unstable. Rotation is what adds a character: a body
   * that leans is a body that has weight in it.
   *
   * It stays under three degrees and over five seconds a cycle, because the
   * failure mode on the other side of this is a mascot that wags at you, and a
   * mascot that performs while you read is harder to forgive than one that
   * sits still.
   */
  | 'sway'
  /** Perfectly still. */
  | 'none';

export function PupuScene({
  pose = 'sit',
  size = 180,
  idle = 'breathe',
  /** Delay before the entrance, to stagger Pupu against the copy beside him. */
  delay = 0,
}: {
  pose?: PupuPose;
  size?: number;
  idle?: Idle;
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
      // the scale, so Pupu fades up in place instead of popping into existence.
      enter.set(withDelay(delay, withTiming(1, { duration: motion.enter })));
      return;
    }
    // A spring, because Pupu should land rather than stop. `dampingRatio` 0.68
    // gives one visible overshoot — the bounce is the character, and this is
    // the rare tier where that is affordable.
    enter.set(withDelay(delay, withSpring(1, { duration: 620, dampingRatio: 0.68 })));
  }, [reduced, delay, enter]);

  /**
   * Whether this Pupu is on the screen you are actually looking at.
   *
   * Expo Router keeps tab screens MOUNTED when you switch away — that is what
   * makes re-tapping a tab return you to where you were. The cost is that a
   * `withRepeat(-1)` loop started on Today keeps running on the UI thread while
   * you are on To-do, and with Pupu on both Today and Me that is two forever
   * loops burning frames for something nobody can see.
   *
   * `Halo` already solves this with its `active` prop; this is the same idea,
   * driven by navigation focus instead of by a timer's state.
   */
  const [focused, setFocused] = useState(true);
  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => setFocused(false);
    }, [])
  );

  useEffect(() => {
    if (!focused) { cancelAnimation(loop); return; }
    if (reduced || idle === 'none') return;
    // 3.8s each way. Deliberately slower than a resting breath, for the same
    // reason the focus halo is: at anything near human tempo it stops being
    // ambient and becomes something to watch. `sway` is slower still — it is
    // the only one that moves a silhouette rather than merely its size.
    const period = idle === 'breathe' ? 3800 : idle === 'sway' ? 2700 : 2600;
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
  }, [focused, reduced, idle, loop]);

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
    const breath = idle === 'breathe' || idle === 'sway' ? 1 + 0.018 * l : 1;
    const lift = idle === 'bob' ? -7 * l : 0;

    /**
     * The lean, and the half-beat of lift that goes with it.
     *
     * `l` runs 0 to 1 and back, so `l - 0.5` is what turns it into a movement
     * that goes BOTH WAYS about the centre rather than one that only ever
     * leaves and returns to rest — a body that tips one way and springs back
     * reads as a flinch, one that tips either side reads as weight moving.
     *
     * The rise is at DOUBLE the rate, so Pupu is highest as he passes through
     * upright and lowest at each extreme. That is what a body does when it
     * shifts from foot to foot, and it is the whole reason this does not look
     * like a picture being rotated.
     */
    const swayed = idle === 'sway' ? l - 0.5 : 0;
    const sway = swayed * 5.2;
    const rock = idle === 'sway' ? -2.6 * (1 - Math.abs(swayed) * 2) : 0;

    return {
      opacity: e,
      transform: [
        { translateY: (1 - e) * 22 + lift + rock + (p > 0 ? -10 * p : 0) },
        { rotate: `${sway}deg` },
        { scaleX: entryScale * breath * (1 - 0.07 * p) },
        { scaleY: entryScale * breath * (1 + 0.09 * p) },
      ],
    };
  });

  return (
    <Animated.View
      style={anim}
      /*
       * Pupu is DECORATIVE, and that is a decision rather than an oversight.
       *
       * Every screen he appears on already states its meaning in text beside
       * him — "Nothing here yet", "Time is up. That counted.", the speech
       * bubble — so a screen reader that also announced "illustration of a dog"
       * would be reading the same beat twice. The rule for an illustration is
       * that it is either meaningful and labelled, or decorative and hidden;
       * what it must never be is unlabelled and focusable.
       *
       * `Pupu` sets the same flags on the Image itself. Belt-and-braces on
       * purpose: it stops the correct behaviour from depending on how one
       * particular element happens to be exposed.
       */
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Pupu size={size} image={POSE_IMAGE[pose]} />
    </Animated.View>
  );
}

/* ------------------------------------------------------------- accessories */

/**
 * Pupu's speech bubble.
 *
 * Taken from Finch rather than from Duolingo: for a planner aimed at people who
 * struggle to start, a character who SAYS something reassuring lands differently
 * from a headline that congratulates you. The copy belongs to the character, so
 * it is set in the UI sans at caption weight — putting it in the display serif
 * would make it the screen's headline, and a screen gets one of those.
 */
export function PupuBubble({ text, delay = 0 }: { text: string; delay?: number }) {
  const { c, shadow } = useTheme();
  const reduced = useReducedMotion();
  const v = useSharedValue(0);

  useEffect(() => {
    // Same cross-fade rule as PupuScene: under Reduce Motion the bubble fades in
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

/** The whole burst, start to last piece gone. */
export const CONFETTI_DURATION = 2200;

export function Confetti({
  height = 260, onDone,
}: {
  height?: number;
  /** Fired once the last piece has gone, so an overlay can unmount itself. */
  onDone?: () => void;
}) {
  const reduced = useReducedMotion();

  /**
   * THE CALLBACK MUST STILL FIRE UNDER REDUCE MOTION.
   *
   * The burst itself is removed — a shower of falling debris has no still
   * frame worth showing, and its entire content is the movement the setting
   * exists to suppress. But callers use `onDone` to dismiss a celebration
   * OVERLAY, and an overlay whose dismissal is wired to an animation that was
   * never allowed to run stays on screen forever. So the timer runs either
   * way; only the pieces are conditional.
   */
  useEffect(() => {
    if (!onDone) return;
    const t = setTimeout(onDone, reduced ? motion.enter : CONFETTI_DURATION);
    return () => clearTimeout(t);
  }, [onDone, reduced]);

  if (reduced) return null;

  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ position: 'absolute', top: 0, height, left: 0, right: 0 }}
    >
      {PIECES.map((p) => (
        <Piece key={`${p.x}-${p.tint}`} piece={p} height={height} />
      ))}
    </View>
  );
}

function Piece({
  piece, height,
}: { piece: (typeof PIECES)[number]; height: number }) {
  const { isDark } = useTheme();
  const t = useSharedValue(0);

  useEffect(() => {
    t.set(
      withDelay(
        piece.d,
        withTiming(1, { duration: CONFETTI_DURATION, easing: Easing.out(Easing.quad) })
      )
    );
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
