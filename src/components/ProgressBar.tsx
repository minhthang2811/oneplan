import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { EASE } from './Press';
import { useTheme } from '../theme/useTheme';
import { radius } from '../theme/tokens';

export function ProgressBar({
  value, height = 6, color, track,
}: { value: number; height?: number; color?: string; track?: string }) {
  const { c } = useTheme();
  const p = useSharedValue(value);

  useEffect(() => { p.set(withTiming(value, { duration: 280, easing: EASE })); }, [value, p]);

  const fill = useAnimatedStyle(() => ({ width: `${Math.max(0, Math.min(1, p.get())) * 100}%` }));

  return (
    <View
      style={{
        height, borderRadius: radius.bar, overflow: 'hidden',
        backgroundColor: track ?? c.surfaceSunken,
      }}
    >
      <Animated.View
        style={[{ height: '100%', borderRadius: radius.bar, backgroundColor: color ?? c.accent }, fill]}
      />
    </View>
  );
}
