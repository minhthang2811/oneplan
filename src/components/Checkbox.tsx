import { useEffect } from 'react';
import { Pressable, View } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, withSpring, useReducedMotion,
} from 'react-native-reanimated';
import { Icon } from './Icon';
import { EASE } from './Press';
import { useTheme } from '../theme/useTheme';
import { motion } from '../theme/tokens';

type Props = {
  checked: boolean;
  onToggle: () => void;
  size?: number;
  /** Uses the task's own tint instead of near-black — for nested steps. */
  subtle?: boolean;
};

/**
 * The fill springs in (a completion deserves a little weight) while the ring
 * cross-fades. 44pt hit area regardless of the drawn size.
 */
export function Checkbox({ checked, onToggle, size = 26, subtle = false }: Props) {
  const { c } = useTheme();
  const fill = useSharedValue(checked ? 1 : 0);
  const reduced = useReducedMotion();

  useEffect(() => {
    fill.set(
      reduced
        ? withTiming(checked ? 1 : 0, { duration: motion.exit })
        : checked
          ? withSpring(1, motion.settle)
          : withTiming(0, { duration: motion.exit, easing: EASE })
    );
  }, [checked, reduced, fill]);

  const fillStyle = useAnimatedStyle(() => ({
    opacity: fill.get(),
    transform: [{ scale: 0.6 + fill.get() * 0.4 }],
  }));
  const markStyle = useAnimatedStyle(() => ({ opacity: fill.get() }));

  const filled = subtle ? c.accent : c.solid;

  return (
    <Pressable
      onPress={onToggle}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}
    >
      <View
        style={{
          width: size, height: size, borderRadius: size / 2,
          borderWidth: 1.75, borderColor: c.inkFaint,
          alignItems: 'center', justifyContent: 'center',
        }}
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
        <Animated.View style={markStyle}>
          <Icon name="checkmark" size={size * 0.52} color={subtle ? c.onAccent : c.onSolid} weight="bold" />
        </Animated.View>
      </View>
    </Pressable>
  );
}
