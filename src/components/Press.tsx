import { type ReactNode } from 'react';
import { Pressable, type StyleProp, type ViewStyle, type PressableProps } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, withSpring, Easing,
  interpolateColor, useReducedMotion, type AnimatedStyle,
} from 'react-native-reanimated';
import { motion } from '../theme/tokens';

/** Built-in curves are too weak; this is the app's single ease-out. */
export const EASE = Easing.bezier(0.23, 1, 0.32, 1);

type Base = Omit<PressableProps, 'style'> & {
  children: ReactNode;
  /**
   * The paint. Typed as an ANIMATED style because the view it lands on is an
   * `Animated.View` — a caller that wants its own fill or border to
   * interpolate (`ChoiceRow` does) has to be able to hand one straight in,
   * and a plain `ViewStyle` is still assignable to this.
   */
  style?: StyleProp<AnimatedStyle<ViewStyle>>;
};

/**
 * Buttons and cards: press like gel.
 *
 * ── THE ASYMMETRY IS THE DESIGN ────────────────────────────────────────────
 * DOWN is a 120ms timing, unchanged. Contact has to be reported immediately or
 * the control feels laggy, and nothing springy is allowed on the way down for
 * that reason. UP is a spring with a visible overshoot, because a gel surface
 * that is pressed and released does not slide back to rest, it REBOUNDS.
 *
 * That split is also what keeps this affordable on an action performed a
 * hundred times a day, which is the frequency tier DESIGN.md gives almost
 * nothing to. The rebound happens after the user already has their answer, so
 * it costs them no waiting — it is the only part of the interaction that reads
 * as material rather than as a state change.
 *
 * ── IT FLATTENS, IT DOES NOT SHRINK ────────────────────────────────────────
 * A uniform scale is a view getting smaller. A droplet pressed under a finger
 * SPREADS: it loses more height than width, because the material has to go
 * somewhere. So X and Y are scaled by different amounts, and the ratio between
 * them is what separates "squish" from "zoom out".
 *
 * ── `style` LANDS ON THE INNER VIEW, SO IT CANNOT CARRY FLEX SIZING ────────
 * The transform has to live on a view INSIDE the `Pressable` — animating the
 * Pressable itself would move the touch target out from under the finger — so
 * whatever is passed here is applied a level below the element the parent
 * actually lays out. Paint (background, radius, padding, gap) works exactly as
 * expected. Anything that asks the PARENT for space does not: `flex: 1` here
 * stretches the inner view inside a Pressable that has already been sized to
 * its content, so the child ends up with no room and silently collapses.
 *
 * `outerStyle` is the way out. It lands on the `Pressable` itself, so it is
 * where sizing goes — `flex`, `maxHeight`, `alignSelf` — while `style` keeps
 * the paint. Splitting them is the only arrangement that lets one component
 * both animate and take part in its parent's layout; the alternative, wrapping
 * every such call site in a spare `View`, puts the same knowledge in every
 * caller instead of in here.
 */
export function PressScale({
  children, style, outerStyle, scaleTo = 0.97, ...rest
}: Base & { scaleTo?: number; outerStyle?: StyleProp<ViewStyle> }) {
  /** 0 at rest, 1 fully pressed. The spring is allowed to overshoot past 0. */
  const p = useSharedValue(0);
  const reduced = useReducedMotion();

  const anim = useAnimatedStyle(() => {
    if (reduced) return { transform: [] };
    const v = p.get();
    const d = 1 - scaleTo;
    return {
      transform: [
        /**
         * `scaleTo` IS THE BOUND, and the squash lives under it. The tighter
         * axis goes to exactly the value the caller asked for and the other
         * one travels less, so the shape still flattens without any axis
         * exceeding the documented limit. Scaling Y *past* `scaleTo` silently
         * redefined a prop several call sites had already been tuned against —
         * `scaleTo={0.94}` on the Focus screen was reaching 0.913.
         */
        { scaleX: 1 - d * v * 0.4 },
        { scaleY: 1 - d * v },
      ],
    };
  });

  return (
    <Pressable
      onPressIn={() => { if (!reduced) p.set(withTiming(1, { duration: motion.press, easing: EASE })); }}
      onPressOut={() => { if (!reduced) p.set(withSpring(0, motion.release)); }}
      style={outerStyle}
      {...rest}
    >
      <Animated.View style={[style, anim]}>{children}</Animated.View>
    </Pressable>
  );
}

/**
 * List rows highlight, they never scale — a scaling row drags its neighbours'
 * baselines with it and the whole list looks loose.
 *
 * THIS IS THE BOUNDARY OF THE GEL TREATMENT, and it is deliberate. A squish is
 * a property of a discrete object with edges you can see; a list row's edges
 * are shared with the rows above and below it, so squishing one announces that
 * it is a separate object and makes the list read as a pile of loose cards. The
 * material language stops where the objects stop being separate.
 */
export function PressHighlight({
  children, style, baseColor, pressColor, ...rest
}: Base & { baseColor: string; pressColor: string }) {
  const p = useSharedValue(0);
  const anim = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(p.get(), [0, 1], [baseColor, pressColor]),
  }));

  return (
    <Pressable
      onPressIn={() => p.set(withTiming(1, { duration: motion.press, easing: EASE }))}
      onPressOut={() => p.set(withTiming(0, { duration: motion.press + 60, easing: EASE }))}
      {...rest}
    >
      <Animated.View style={[style, anim]}>{children}</Animated.View>
    </Pressable>
  );
}
