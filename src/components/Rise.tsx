import { useEffect, type ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, withTiming, withDelay,
  useReducedMotion,
} from 'react-native-reanimated';
import { motion } from '../theme/tokens';

/**
 * Content that arrives on a spring as its screen does.
 *
 * ── WHAT THIS IS FOR, AND WHAT IT IS NOT ───────────────────────────────────
 * This is NOT a replacement for the navigator's transition. The platform push
 * is already a spring-backed, interruptible, gesture-tracking animation that no
 * JavaScript reimplementation matches, so the stack keeps it (see the options
 * on `task/[id]` in `app/_layout.tsx`).
 *
 * What the platform push cannot do is give the *contents* of the arriving
 * screen any continuity with where you came from. A pushed screen slides in
 * fully composed, as one flat slab. Staggering its own content behind the slide
 * is what iOS does with a navigation bar's title, and it is the difference
 * between a screen appearing and a screen assembling.
 *
 * ── `fromScale` IS THE SHARED-ELEMENT PART ─────────────────────────────────
 * Give it the ratio between an element's size in the list you came FROM and its
 * size here, and it grows through exactly that range as it settles. The task's
 * emoji disc is 40pt in a row and 84pt here, so `40 / 84` means it enters at the
 * size the thing you tapped actually was. It is not a true shared-element
 * transition — the real disc never leaves the list — but the size continuity is
 * the part the eye reads, and it costs one number instead of a second
 * navigator.
 *
 * ── TIMING ─────────────────────────────────────────────────────────────────
 * The default delay overlaps the tail of the push rather than waiting for it.
 * Waiting reads as two animations played back to back; overlapping reads as
 * parallax, which is what it is.
 */
export function Rise({
  children,
  delay = 80,
  distance = 14,
  fromScale,
  style,
}: {
  children: ReactNode;
  delay?: number;
  /** How far below its final position it starts. */
  distance?: number;
  /** Scale to enter at — see the note above. Omit for no scaling. */
  fromScale?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const reduced = useReducedMotion();
  const v = useSharedValue(0);

  useEffect(() => {
    if (reduced) {
      // The app-wide rule: spatial motion collapses to a cross-fade. Both the
      // travel and the scale are spatial, so only the opacity survives.
      v.set(withDelay(delay, withTiming(1, { duration: motion.enter })));
      return;
    }
    v.set(withDelay(delay, withSpring(1, { duration: 540, dampingRatio: 0.78 })));
  }, [reduced, delay, v]);

  const anim = useAnimatedStyle(() => {
    const t = v.get();
    if (reduced) return { opacity: t, transform: [] };
    return {
      // Opacity is deliberately ahead of the travel: content that fades in over
      // its whole journey spends most of it as a ghost, which reads as slow.
      opacity: Math.min(t * 2, 1),
      transform: [
        { translateY: (1 - t) * distance },
        { scale: fromScale == null ? 1 : fromScale + (1 - fromScale) * t },
      ],
    };
  });

  return <Animated.View style={[style, anim]}>{children}</Animated.View>;
}
