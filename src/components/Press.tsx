import { type ReactNode } from 'react';
import { Pressable, type StyleProp, type ViewStyle, type PressableProps } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, Easing,
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
 * Buttons and cards: scale 0.97 on press-IN. Under 150ms so it reads as
 * contact, not as an animation.
 */
export function PressScale({ children, style, scaleTo = 0.97, ...rest }: Base & { scaleTo?: number }) {
  const s = useSharedValue(1);
  const reduced = useReducedMotion();
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: s.get() }] }));

  return (
    <Pressable
      onPressIn={() => { if (!reduced) s.set(withTiming(scaleTo, { duration: motion.press, easing: EASE })); }}
      onPressOut={() => { if (!reduced) s.set(withTiming(1, { duration: motion.press + 40, easing: EASE })); }}
      {...rest}
    >
      <Animated.View style={[style, anim]}>{children}</Animated.View>
    </Pressable>
  );
}

/**
 * List rows highlight, they never scale — a scaling row drags its neighbours'
 * baselines with it and the whole list looks loose.
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
