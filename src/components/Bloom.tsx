import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withRepeat, withSequence, withTiming,
  useReducedMotion, Easing,
} from 'react-native-reanimated';
import { useTheme } from '../theme/useTheme';
import type { TintName } from '../theme/tokens';

type Disc = { tint: TintName; size: number; x: number; y: number; delay: number };

const DISCS: Disc[] = [
  { tint: 'lilac',  size: 116, x: 0,   y: 54,  delay: 0 },
  { tint: 'peach',  size: 84,  x: 96,  y: 0,   delay: 260 },
  { tint: 'mint',   size: 64,  x: 150, y: 96,  delay: 520 },
  { tint: 'butter', size: 48,  x: 36,  y: 152, delay: 760 },
];

/**
 * The brand mark: overlapping tinted discs breathing slightly out of phase.
 * Built from the same tint palette the tasks use, so the identity and the data
 * encoding are visibly the same system rather than two unrelated style worlds.
 *
 * This is delight on a rare, first-run moment — it appears once, in onboarding.
 */
export function Bloom({ scale = 1 }: { scale?: number }) {
  const reduced = useReducedMotion();
  return (
    <View style={{ width: 214 * scale, height: 216 * scale }}>
      {DISCS.map((d) => (
        <Disc key={d.tint} disc={d} scale={scale} reduced={reduced} />
      ))}
    </View>
  );
}

function Disc({ disc, scale, reduced }: { disc: Disc; scale: number; reduced: boolean }) {
  const theme = useTheme();
  const t = theme.tint(disc.tint);
  const float = useSharedValue(0);

  useEffect(() => {
    if (reduced) return;
    float.set(
      withRepeat(
        withSequence(
          withTiming(1, { duration: 2600, easing: Easing.inOut(Easing.quad) }),
          withTiming(0, { duration: 2600, easing: Easing.inOut(Easing.quad) })
        ),
        -1,
        false
      )
    );
  }, [float, reduced]);

  const anim = useAnimatedStyle(() => ({
    transform: [{ translateY: -6 * float.get() }, { scale: 1 + 0.02 * float.get() }],
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: disc.x * scale,
          top: disc.y * scale,
          width: disc.size * scale,
          height: disc.size * scale,
          borderRadius: (disc.size * scale) / 2,
          backgroundColor: t.bg,
        },
        anim,
      ]}
    />
  );
}
