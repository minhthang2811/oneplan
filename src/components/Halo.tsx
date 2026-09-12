import { useEffect } from 'react';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import Animated, {
  useSharedValue, useAnimatedStyle, withRepeat, withSequence, withTiming,
  useReducedMotion, Easing,
} from 'react-native-reanimated';

/**
 * A slow glow breathing around the focus ring.
 *
 * It is a RADIAL GRADIENT, not a tinted disc. A flat circle at any opacity high
 * enough to notice reads as a second solid shape competing with the ring — the
 * eye sees an edge, and an edge is an object. Only a gradient with no edge
 * reads as light.
 *
 * The gradient peaks AT the ring's own radius and falls away in both
 * directions, so the glow hugs the ring instead of flooding the numerals in the
 * middle, which have to stay legible on the canvas.
 *
 * This is the app's only ambient (non-triggered) animation, and it is confined
 * to the one screen you are meant to stop looking at. Its job is to say "this
 * is still running" at a glance — the numerals require reading, the glow does
 * not — and its 4.4s period is deliberately far slower than a resting breath so
 * it never turns into something to watch.
 *
 * It does not render at all under Reduce Motion: a pulsing field is exactly the
 * kind of continuous movement that setting exists to remove.
 */
export function Halo({
  size, ringSize, color, active,
}: {
  /** Full extent of the glow, including the outer falloff. */
  size: number;
  /** Diameter of the ring the glow is wrapped around. */
  ringSize: number;
  color: string;
  active: boolean;
}) {
  const reduced = useReducedMotion();
  const pulse = useSharedValue(0);

  useEffect(() => {
    if (!active || reduced) { pulse.set(withTiming(0, { duration: 400 })); return; }
    pulse.set(
      withRepeat(
        withSequence(
          withTiming(1, { duration: 2200, easing: Easing.inOut(Easing.quad) }),
          withTiming(0, { duration: 2200, easing: Easing.inOut(Easing.quad) })
        ),
        -1,
        false
      )
    );
  }, [active, reduced, pulse]);

  const anim = useAnimatedStyle(() => ({
    opacity: 0.45 + 0.55 * pulse.get(),
    transform: [{ scale: 0.97 + 0.05 * pulse.get() }],
  }));

  if (reduced) return null;

  // Where the ring sits as a fraction of the gradient's own radius.
  const peak = ringSize / size;

  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute' }, anim]}>
      <Svg width={size} height={size}>
        <Defs>
          <RadialGradient id="halo" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={color} stopOpacity={0} />
            <Stop offset={Math.max(0, peak - 0.16).toFixed(3)} stopColor={color} stopOpacity={0} />
            <Stop offset={peak.toFixed(3)} stopColor={color} stopOpacity={0.30} />
            <Stop offset="1" stopColor={color} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx={size / 2} cy={size / 2} r={size / 2} fill="url(#halo)" />
      </Svg>
    </Animated.View>
  );
}
