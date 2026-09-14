import { useEffect, useRef, useState } from 'react';
import { Pressable, View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, useAnimatedProps, withTiming, withSpring,
  withSequence, withDelay, useReducedMotion, interpolate, Extrapolation,
  runOnJS, type SharedValue,
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
  /**
   * What this box controls, for a screen reader — the activity or step title.
   *
   * The surrounding row already announces the title, but VoiceOver focuses this
   * control SEPARATELY, and on its own an unlabelled checkbox reads as
   * "checkbox, checked" with no indication of what was checked. It is the same
   * rule DESIGN.md states for the mascot: a thing is either meaningful and
   * labelled or decorative and hidden, and what it must never be is unlabelled
   * and focusable.
   */
  label?: string;
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

/** How many marks fly out of a completed box, and how long each one is. */
const SPOKES = 8;
const SPOKE_LEN = 0.22;

/**
 * Completing something is the most-repeated satisfying moment in the app, so
 * the whole interaction is built out of five beats that each do one job:
 *
 *   CONTACT The box compresses under the finger the moment it is touched and
 *           rebounds when it is released, on the app's press asymmetry — a
 *           120ms timing down, a spring back up. This is the beat that was
 *           MISSING, and its absence was the real defect in the old box:
 *           everything else in the app reports contact instantly (`PressScale`,
 *           `PressHighlight`) and the checkbox alone sat inert until the store
 *           came back, which read as the tap not having landed.
 *   BLOOM   A soft disc of the accent swells behind the box while it is held.
 *           Apple's guidance is that a control in the content layer may take on
 *           a glass appearance "to emphasize its interactivity when a person
 *           activates it" — this is that beat, painted rather than materialised
 *           (see the note on the bloom below).
 *   FILL    The disc springs up from the centre while the outline fades into
 *           it, so the colour arrives with weight instead of switching on, and
 *           the ring is ABSORBED rather than left drawn around a filled circle.
 *   DRAW    The tick STROKES ITSELF along its own path, via an animated
 *           `strokeDashoffset`, rotating the last few degrees upright as it
 *           goes. A mark that appears has been asserted; a mark that is drawn
 *           has been made, and the difference is most of why this feels
 *           satisfying rather than merely responsive.
 *   BURST   Eight short marks fly outward and fade. This replaced a single
 *           expanding ring: a ring has to be watched to be read, because its
 *           whole signal is one edge moving slowly outward, while spokes are
 *           read instantly from the corner of the eye — which is the only
 *           thing this beat is for, since the tap usually happens off to the
 *           side of where you are actually looking.
 *
 * UNCHECKING GETS CONTACT AND NOTHING ELSE. It retracts the stroke, deflates
 * the fill, restores the ring, and fires no burst — the same rule the routine
 * chips follow, that undoing something is a correction and a correction is not
 * celebrated. An app that throws the same confetti for "done" and "not done" is
 * telling you it was not paying attention.
 */
export function Checkbox({ checked, onToggle, size = 26, subtle = false, identity, label }: Props) {
  const { c } = useTheme();
  const reduced = useReducedMotion();

  /** 0 → 1. Drives the fill, and inversely the outline. */
  const fill = useSharedValue(checked ? 1 : 0);
  /** 0 → 1 along the tick's path. Separate from `fill` so the disc is already
   *  there to be drawn ON before the pen touches down. */
  const draw = useSharedValue(checked ? 1 : 0);
  /** −1 squashed, 0 rest. Shared by the completion beat and the press. */
  const squish = useSharedValue(0);
  /** 0 → 1 while a finger is down. Drives the bloom. */
  const press = useSharedValue(0);
  /** One-shot burst, only ever on the way in. */
  const burst = useSharedValue(0);

  /**
   * THE SPOKES ONLY EXIST WHILE THEY ARE FLYING.
   *
   * Eight extra views per checkbox is nothing on one screen and is not nothing
   * on a list: FlashList keeps roughly a screen and a half of rows alive, each
   * with a box, and most of those rows will never be tapped. Mounting them on
   * demand means the steady-state cost of the burst is zero views and the only
   * thing paying for it is the row that was actually completed.
   *
   * The flag is cleared from the animation's own completion callback rather
   * than a `setTimeout`, so an interrupted burst — a recycle mid-flight —
   * unmounts them instead of leaving eight views pinned at whatever opacity
   * they had reached.
   */
  const [bursting, setBursting] = useState(false);

  /**
   * A CHANGE OF VALUE IS NOT ALWAYS A COMPLETION.
   *
   * These rows live in a FlashList, which RECYCLES them: scroll a done task off
   * the top and its view is handed to an undone task further down, flipping
   * `checked` on the way. Animating on the prop alone means a screen full of
   * ticks drawing themselves and bursts firing every time the list is scrolled
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
      burst.set(0);
      setBursting(false);
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
          withTiming(-1, { duration: motion.check.squish, easing: EASE }),
          withSpring(0, { duration: 520, dampingRatio: 0.48 })
        )
      );
      fill.set(withSpring(1, motion.check.fill));
      // Held back until the disc has most of its area, so the tick is drawn on
      // a surface rather than in mid-air.
      draw.set(withDelay(motion.check.drawDelay, withTiming(1, { duration: motion.check.draw, easing: EASE })));

      setBursting(true);
      burst.set(0);
      burst.set(
        withTiming(1, { duration: motion.check.burst, easing: EASE }, (done) => {
          'worklet';
          // Cleared on cancellation too — `done` is false when a recycle
          // interrupts, and that is exactly when the views must come down.
          runOnJS(setBursting)(false);
        })
      );
      return;
    }

    // Undo. Quicker than the commit and with no burst — see the note above.
    squish.set(withSequence(
      withTiming(-0.5, { duration: 80, easing: EASE }),
      withSpring(0, motion.settle)
    ));
    draw.set(withTiming(0, { duration: 140, easing: EASE }));
    fill.set(withDelay(60, withTiming(0, { duration: motion.check.undo, easing: EASE })));
  }, [checked, identity, reduced, fill, draw, squish, burst]);

  /**
   * The rubbery part. Anti-phase X/Y, so it deforms rather than just scaling,
   * and the press rides the same value so a tap and a completion cannot fight
   * each other for the transform.
   */
  const boxStyle = useAnimatedStyle(() => {
    if (reduced) return { transform: [] };
    const s = squish.get() - 0.55 * press.get();
    return {
      transform: [
        { scaleX: 1 + 0.12 * s + (s < 0 ? -0.06 * s : 0) },
        { scaleY: 1 + 0.16 * s },
      ],
    };
  });

  /**
   * THE PRESS BLOOM.
   *
   * Apple sanctions a Liquid Glass appearance for a content-layer toggle at the
   * moment it is activated, and this is deliberately NOT that — it is a painted
   * disc of the accent doing the same job. A real `GlassView` is a native view,
   * and this control appears once per task row and once per step inside every
   * expanded routine; instantiating the system material per row, to be seen for
   * 120ms on the small fraction of rows that get tapped, spends a native view
   * on every row in the list to decorate the few. At 26pt, under a fingertip,
   * behind an opaque disc that is about to cover it, the two are
   * indistinguishable — so this is the cheap one, on purpose.
   */
  const bloomStyle = useAnimatedStyle(() => {
    const p = press.get();
    if (reduced || p === 0) return { opacity: 0, transform: [{ scale: 1 }] };
    return { opacity: 0.5 * p, transform: [{ scale: 1 + 0.5 * p }] };
  });

  /**
   * The outline, and the fill that eats it.
   *
   * They are two views rather than a `borderWidth` that animates, because
   * border width is a layout property: animating it re-runs layout every frame
   * and cannot be driven from the UI thread at all. Cross-fading two
   * pre-composed circles is a compositor op.
   */
  const ringStyle = useAnimatedStyle(() => ({
    opacity: 1 - fill.get(),
    transform: [{ scale: 1 + 0.08 * fill.get() }],
  }));

  const fillStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, fill.get() * 1.6),
    transform: [{ scale: 0.34 + fill.get() * 0.66 }],
  }));

  /**
   * The tick settles upright as it is drawn — it starts a few degrees off and
   * arrives level. It is small enough that nobody will name it and large enough
   * that removing it makes the mark feel stamped on rather than written.
   */
  const markStyle = useAnimatedStyle(() => {
    if (reduced) return { transform: [] };
    return { transform: [{ rotate: `${interpolate(draw.get(), [0, 1], [-16, 0], Extrapolation.CLAMP)}deg` }] };
  });

  /**
   * The dash IS the animation. One number crosses to the UI thread per frame,
   * on a path with two segments — this is about as cheap as vector animation
   * gets, and it is why the tick can be drawn on every row of a list.
   */
  const tickProps = useAnimatedProps(() => ({
    strokeDashoffset: TICK_LENGTH * (1 - draw.get()),
  }));

  const filled = subtle ? c.accent : c.solid;
  const mark = subtle ? c.onAccent : c.onSolid;

  return (
    <Pressable
      onPress={onToggle}
      onPressIn={() => { if (!reduced) press.set(withTiming(1, { duration: motion.press, easing: EASE })); }}
      onPressOut={() => { if (!reduced) press.set(withSpring(0, motion.release)); }}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={label}
      /**
       * A handle for the e2e suite, keyed on the TITLE rather than the id —
       * seed ids come from `uid()` and are re-randomised every run, so a flow
       * could never name one. `testID` becomes `accessibilityIdentifier` on
       * iOS, which XCUITest queries and VoiceOver does not announce.
       *
       * IT IS ONLY REACHABLE WHERE THIS BOX IS NOT INSIDE AN ACCESSIBILITY
       * CONTAINER. Verified, not assumed: a Maestro `tapOn: { id: ... }`
       * against a task row's checkbox fails with "Element not found", because
       * the row carries a role and a label and iOS therefore exposes it as a
       * single element with no descendants. It works on the task detail
       * screen, where the step row is a plain `View`.
       */
      testID={label ? `checkbox-${label}` : undefined}
      style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}
    >
      {/* Behind everything, and OUTSIDE the squish — a burst that inherited the
          box's deformation would fly out along an ellipse. */}
      {bursting ? <Burst size={size} color={filled} burst={burst} /> : null}

      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: 'absolute',
            width: size, height: size, borderRadius: size / 2,
            backgroundColor: c.accentSoft,
          },
          bloomStyle,
        ]}
      />

      <Animated.View
        style={[
          { width: size, height: size, alignItems: 'center', justifyContent: 'center' },
          boxStyle,
        ]}
      >
        <Animated.View
          pointerEvents="none"
          style={[
            {
              position: 'absolute', width: size, height: size,
              borderRadius: size / 2, borderWidth: 1.75, borderColor: c.inkFaint,
            },
            ringStyle,
          ]}
        />

        <Animated.View
          pointerEvents="none"
          style={[
            {
              position: 'absolute', width: size, height: size,
              borderRadius: size / 2, backgroundColor: filled,
            },
            fillStyle,
          ]}
        />

        <Animated.View style={[StyleSheet.absoluteFill, markStyle]} pointerEvents="none">
          <Svg width={size} height={size} viewBox="0 0 24 24">
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
      </Animated.View>
    </Pressable>
  );
}

/**
 * The eight marks that fly out of a completed box.
 *
 * Each spoke is a plain view that is STATICALLY rotated into place and then
 * moved outward by an animated `translateY` — so the only thing crossing to the
 * UI thread is a transform per spoke, with no layout and no repaint. Rotating
 * the container and translating the child is what lets one linear value produce
 * eight radial paths without any trigonometry per frame.
 *
 * They travel, shrink and fade on slightly different schedules by index, which
 * is what stops eight identical marks from reading as a mechanical starburst.
 */
function Burst({
  size, color, burst,
}: {
  size: number;
  color: string;
  burst: SharedValue<number>;
}) {
  return (
    <View
      pointerEvents="none"
      style={{ position: 'absolute', width: size, height: size, alignItems: 'center', justifyContent: 'center' }}
    >
      {Array.from({ length: SPOKES }, (_, i) => (
        <Spoke key={i} index={i} size={size} color={color} burst={burst} />
      ))}
    </View>
  );
}

function Spoke({
  index, size, color, burst,
}: {
  index: number;
  size: number;
  color: string;
  burst: SharedValue<number>;
}) {
  // Alternating reach, so the burst has a rhythm rather than a perfect ring.
  const far = index % 2 === 0 ? 1 : 0.76;
  const len = size * SPOKE_LEN * far;

  const anim = useAnimatedStyle(() => {
    const v = burst.get();
    // Out fast, gone slowly: the marks have arrived at their full reach by the
    // time the tick finishes drawing, and spend the rest of the beat fading.
    const out = interpolate(v, [0, 0.55], [0, 1], Extrapolation.CLAMP);
    return {
      opacity: interpolate(v, [0, 0.1, 0.55, 1], [0, 1, 0.85, 0], Extrapolation.CLAMP),
      transform: [
        { translateY: -(size * 0.5 + size * 0.34 * far * out) },
        { scaleY: interpolate(v, [0, 0.55, 1], [0.35, 1, 0.5], Extrapolation.CLAMP) },
      ],
    };
  });

  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        alignItems: 'center', justifyContent: 'center',
        transform: [{ rotate: `${(360 / SPOKES) * index}deg` }],
      }}
    >
      <Animated.View
        style={[
          { width: 2, height: len, borderRadius: 1, backgroundColor: color },
          anim,
        ]}
      />
    </View>
  );
}
