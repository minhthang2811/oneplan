import { type ReactNode } from 'react';
import { Pressable, type StyleProp, type ViewStyle, type PressableProps } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, withSpring, Easing,
  interpolateColor, useReducedMotion,
} from 'react-native-reanimated';
import { motion } from '../theme/tokens';

/** Built-in curves are too weak; this is the app's single ease-out. */
export const EASE = Easing.bezier(0.23, 1, 0.32, 1);

type Base = Omit<PressableProps, 'style'> & {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
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
 */
export function PressScale({ children, style, scaleTo = 0.97, ...rest }: Base & { scaleTo?: number }) {
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
