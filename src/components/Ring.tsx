import Svg, { Circle } from 'react-native-svg';
import { useEffect } from 'react';
import Animated, {
  useAnimatedProps, useSharedValue, withTiming, type SharedValue,
} from 'react-native-reanimated';
import { EASE } from './Press';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/**
 * Countdown ring. `progress` is a shared value so the sweep runs entirely on
 * the UI thread — one long `withTiming` instead of a per-second JS re-render.
 */
export function Ring({
  size, strokeWidth, progress, color, track, tickColor,
}: {
  size: number;
  strokeWidth: number;
  progress: SharedValue<number>;
  color: string;
  track: string;
  /** Draws the minute texture across the band. Omit for plain progress rings. */
  tickColor?: string;
}) {
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - Math.max(0, Math.min(1, progress.get()))),
  }));

  /**
   * 60 minute ticks, drawn as a dashed stroke laid OVER the whole band rather
   * than as sixty separate marks.
   *
   * Over, not under: the ticks then striate the filled arc and the empty track
   * with one static element, so the texture costs a single node and never has
   * to animate. Sixty individually-coloured ticks would each need to re-resolve
   * against the sweeping progress every frame.
   */
  const tickGap = circumference / 60;

  return (
    <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
      <Circle
        cx={size / 2} cy={size / 2} r={r}
        stroke={track} strokeWidth={strokeWidth} fill="none"
      />
      <AnimatedCircle
        cx={size / 2} cy={size / 2} r={r}
        stroke={color} strokeWidth={strokeWidth} fill="none"
        strokeLinecap="round"
        strokeDasharray={circumference}
        animatedProps={animatedProps}
      />
      {tickColor ? (
        <Circle
          cx={size / 2} cy={size / 2} r={r}
          stroke={tickColor} strokeWidth={strokeWidth} fill="none"
          strokeDasharray={`1.5 ${tickGap - 1.5}`}
          opacity={0.5}
        />
      ) : null}
    </Svg>
  );
}

/**
 * Ring driven by a plain number instead of a shared value — for the small
 * static progress indicators that only change when data changes.
 */
export function RingValue({
  size, strokeWidth, value, color, track,
}: { size: number; strokeWidth: number; value: number; color: string; track: string }) {
  const p = useSharedValue(value);
  useEffect(() => { p.set(withTiming(value, { duration: 320, easing: EASE })); }, [value, p]);
  return <Ring size={size} strokeWidth={strokeWidth} progress={p} color={color} track={track} />;
}
