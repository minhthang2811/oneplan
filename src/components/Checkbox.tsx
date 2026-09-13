import { useEffect, useRef } from 'react';
import { Pressable, View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, useAnimatedProps, withTiming, withSpring,
  withSequence, withDelay, useReducedMotion, interpolate, Extrapolation,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { EASE } from './Press';
import { useTheme } from '../theme/useTheme';
import { motion } from '../theme/tokens';

type Props = {
  checked: boolean;
  onToggle: () => void;
  size?: number;
  /** Uses the task's own tint instead of near-black — for nested steps. */
  subtle?: boolean;
  /**
   * The id of the thing being checked. REQUIRED inside a virtualised list —
   * see the note on recycling in the component below. Omit it only where the
   * component is guaranteed to be about one item for its whole life, such as
   * the task detail screen.
   */
  identity?: string;
};

const AnimatedPath = Animated.createAnimatedComponent(Path);

/**
 * The tick, drawn on a 24x24 grid. Short arm down-right, long arm up-right —
 * the standard proportions, kept as an explicit path rather than an SF Symbol
 * because a symbol is a glyph that can only appear, and this one has to be
 * DRAWN.
 */
const TICK = 'M6 12.4 L10.3 16.6 L18 8.6';
/**
 * The path's own length, used as both the dash and the offset. Measured once by
 * hand rather than read from `getTotalLength()`: there is no DOM here, and a
 * constant cannot go out of sync with a constant.
 *
 *   sqrt(4.3² + 4.2²) = 6.01   +   sqrt(7.7² + 8.0²) = 11.10   =  17.11
 *
 * Rounded up so the tail is fully hidden at offset = length; a fraction short
 * leaves a visible speck at the end of the stroke.
 */
const TICK_LENGTH = 17.4;

/**
 * Completing something is the most-repeated satisfying moment in the app, so
 * the whole interaction is built out of four beats that each do one job:
 *
 *   SQUISH  The box compresses and rebounds on a loose spring. It is the only
 *           part that fires on the way OUT as well as in, because it is contact
 *           feedback rather than celebration.
 *   FILL    The disc springs up from the centre, so the colour arrives with
 *           weight instead of switching on.
 *   DRAW    The tick STROKES ITSELF along its own path, via an animated
 *           `strokeDashoffset`. A mark that appears has been asserted; a mark
 *           that is drawn has been made, and the difference is most of why this
 *           feels satisfying rather than merely responsive.
 *   POP     One ring expands out past the box and fades. It is the only part
 *           that costs nothing to ignore, and it is what carries at a glance
 *           when the tap happens off to the side of where you are reading.
 *
 * UNCHECKING GETS THE SQUISH AND NOTHING ELSE. It retracts the stroke, deflates
 * the fill, and fires no ring — the same rule the routine chips follow, that
 * undoing something is a correction and a correction is not celebrated. An
 * app that throws the same confetti for "done" and "not done" is telling you it
 * was not paying attention.
 */
export function Checkbox({ checked, onToggle, size = 26, subtle = false, identity }: Props) {
  const { c } = useTheme();
  const reduced = useReducedMotion();

  /** 0 → 1. Drives the fill and, with a slight lead, the stroke. */
  const fill = useSharedValue(checked ? 1 : 0);
  /** 0 → 1 along the tick's path. Separate from `fill` so the disc is already
   *  there to be drawn ON before the pen touches down. */
  const draw = useSharedValue(checked ? 1 : 0);
  /** −1 squashed, 0 rest, +1 stretched. */
  const squish = useSharedValue(0);
  /** One-shot ring, only ever on the way in. */
  const pop = useSharedValue(0);

  /**
   * A CHANGE OF VALUE IS NOT ALWAYS A COMPLETION.
   *
   * These rows live in a FlashList, which RECYCLES them: scroll a done task off
   * the top and its view is handed to an undone task further down, flipping
   * `checked` on the way. Animating on the prop alone means a screen full of
   * ticks drawing themselves and rings popping every time the list is scrolled
   * — the same trap DESIGN.md flags for `entering` animations on recycled rows,
   * arriving through a different door.
   *
   * The distinction that matters is not "did the user press THIS view" — they
   * can also toggle a step by tapping its label — but "is this still the same
   * item". So the box remembers which item it was last showing. Same item with
   * a new value is a completion and gets the performance; a different item is a
   * recycle and gets the finished state with no animation at all, which is
   * what a checkbox you never touched should look like.
   */
  const prev = useRef({ identity, checked });

  useEffect(() => {
    const sameItem = prev.current.identity === identity;
    const changed = prev.current.checked !== checked;
    prev.current = { identity, checked };

    if (!sameItem || !changed) {
      const v = checked ? 1 : 0;
      fill.set(v);
      draw.set(v);
      squish.set(0);
      pop.set(0);
      return;
    }

    if (reduced) {
      // Reduce Motion keeps the state change and drops the performance: the
      // fill cross-fades and the tick appears whole rather than being drawn,
      // because drawing is a shape travelling across the screen.
      fill.set(withTiming(checked ? 1 : 0, { duration: motion.exit }));
      draw.set(withTiming(checked ? 1 : 0, { duration: motion.exit }));
      return;
    }

    if (checked) {
      squish.set(
        withSequence(
          withTiming(-1, { duration: 90, easing: EASE }),
          withSpring(0, { duration: 520, dampingRatio: 0.48 })
        )
      );
      fill.set(withSpring(1, { duration: 420, dampingRatio: 0.62 }));
      // Held back until the disc has most of its area, so the tick is drawn on
      // a surface rather than in mid-air.
      draw.set(withDelay(70, withTiming(1, { duration: 240, easing: EASE })));
      pop.set(withSequence(
        withTiming(0, { duration: 0 }),
        withTiming(1, { duration: 460, easing: EASE })
      ));
      return;
    }

    // Undo. Quicker than the commit and with no ring — see the note above.
    squish.set(withSequence(
      withTiming(-0.5, { duration: 80, easing: EASE }),
      withSpring(0, motion.settle)
    ));
    draw.set(withTiming(0, { duration: 140, easing: EASE }));
    fill.set(withDelay(60, withTiming(0, { duration: motion.exit, easing: EASE })));
  }, [checked, identity, reduced, fill, draw, squish, pop]);

  /** The rubbery part. Anti-phase X/Y, so it deforms rather than just scaling. */
  const boxStyle = useAnimatedStyle(() => {
    if (reduced) return { transform: [] };
    const s = squish.get();
    return {
      transform: [
        { scaleX: 1 + 0.12 * s + (s < 0 ? -0.06 * s : 0) },
        { scaleY: 1 + 0.16 * s },
      ],
    };
  });

  const fillStyle = useAnimatedStyle(() => ({
    opacity: fill.get(),
    transform: [{ scale: 0.55 + fill.get() * 0.45 }],
  }));

  /**
   * The dash IS the animation. One number crosses to the UI thread per frame,
   * on a path with two segments — this is about as cheap as vector animation
   * gets, and it is why the tick can be drawn on every row of a list.
   */
  const tickProps = useAnimatedProps(() => ({
    strokeDashoffset: TICK_LENGTH * (1 - draw.get()),
  }));

  /** Out past the box and gone. Never loops, never repeats on re-render. */
  const popStyle = useAnimatedStyle(() => {
    const p = pop.get();
    if (reduced || p === 0) return { opacity: 0 };
    return {
      opacity: interpolate(p, [0, 0.12, 1], [0, 0.5, 0], Extrapolation.CLAMP),
      transform: [{ scale: interpolate(p, [0, 1], [0.9, 1.9], Extrapolation.CLAMP) }],
    };
  });

  const filled = subtle ? c.accent : c.solid;
  const mark = subtle ? c.onAccent : c.onSolid;

  return (
    <Pressable
      onPress={onToggle}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}
    >
      {/* Outside the squish, so the ring leaves a box that is still deforming
          instead of inheriting the deformation and going oval. */}
      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: 'absolute',
            width: size, height: size, borderRadius: size / 2,
            borderWidth: 2, borderColor: filled,
          },
          popStyle,
        ]}
      />

      <Animated.View
        style={[
          {
            width: size, height: size, borderRadius: size / 2,
            borderWidth: 1.75, borderColor: c.inkFaint,
            alignItems: 'center', justifyContent: 'center',
          },
          boxStyle,
        ]}
      >
        <Animated.View
          style={[
            {
              position: 'absolute', width: size, height: size,
              borderRadius: size / 2, backgroundColor: filled,
            },
            fillStyle,
          ]}
        />

        <Svg width={size} height={size} viewBox="0 0 24 24" style={StyleSheet.absoluteFill}>
          <AnimatedPath
            d={TICK}
            fill="none"
            stroke={mark}
            strokeWidth={2.9}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={TICK_LENGTH}
            animatedProps={tickProps}
          />
        </Svg>
      </Animated.View>
    </Pressable>
  );
}
