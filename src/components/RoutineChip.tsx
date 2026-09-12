import { useEffect } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, withSpring, withSequence,
  interpolateColor, useReducedMotion,
} from 'react-native-reanimated';
import { Txt } from './Txt';
import { Icon } from './Icon';
import { EASE } from './Press';
import { useTheme } from '../theme/useTheme';
import { radius, space, motion } from '../theme/tokens';

/**
 * A pickable routine, as a pill of emoji + label.
 *
 * Selection is carried by FILL, not by a checkmark. At a dozen chips on screen
 * a row of checkboxes reads as a form to be completed; a block of filled pills
 * reads as a shape you can take in at a glance — which is the same reason the
 * rest of the app encodes state as colour.
 *
 * The tick that fades in is a second, redundant channel for the same state, so
 * selection does not rely on colour alone.
 */
export function RoutineChip({
  emoji, label, selected, onPress,
}: { emoji: string; label: string; selected: boolean; onPress: () => void }) {
  const { c } = useTheme();
  const reduced = useReducedMotion();

  const sel = useSharedValue(selected ? 1 : 0);
  const press = useSharedValue(1);
  // Separate from `press` so a selection pop cannot be cut short by the
  // press-out animation landing on the same value.
  const pop = useSharedValue(1);

  useEffect(() => {
    if (reduced) {
      sel.set(withTiming(selected ? 1 : 0, { duration: motion.exit }));
      return;
    }
    sel.set(withSpring(selected ? 1 : 0, motion.settle));
    if (selected) {
      // A small overshoot on the way IN only. Deselecting is a correction and
      // should not be celebrated.
      pop.set(withSequence(
        withTiming(1.055, { duration: 110, easing: EASE }),
        withSpring(1, { duration: 320, dampingRatio: 0.55 })
      ));
    }
  }, [selected, reduced, sel, pop]);

  const skin = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(sel.get(), [0, 1], [c.surface, c.accentSoft]),
    borderColor: interpolateColor(sel.get(), [0, 1], [c.hairline, c.accent]),
    transform: [{ scale: press.get() * pop.get() }],
  }));

  const tick = useAnimatedStyle(() => ({
    opacity: sel.get(),
    width: 14 * sel.get(),
    transform: [{ scale: 0.6 + 0.4 * sel.get() }],
  }));

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => { if (!reduced) press.set(withTiming(0.95, { duration: motion.press, easing: EASE })); }}
      onPressOut={() => { if (!reduced) press.set(withTiming(1, { duration: motion.press + 40, easing: EASE })); }}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={label}
      hitSlop={4}
    >
      <Animated.View
        style={[
          {
            flexDirection: 'row', alignItems: 'center', gap: 6,
            minHeight: 44, paddingLeft: 12, paddingRight: 14,
            borderRadius: radius.pill, borderWidth: 1.5,
          },
          skin,
        ]}
      >
        <Text style={{ fontSize: 15, lineHeight: 20 }} allowFontScaling={false}>{emoji}</Text>
        <Txt variant="bodyStrong" color={selected ? c.accentInk : c.ink} numberOfLines={1}>
          {label}
        </Txt>
        <Animated.View style={[{ overflow: 'hidden', alignItems: 'flex-end' }, tick]}>
          <Icon name="checkmark" size={11} color={c.accentInk} weight="bold" />
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}

/**
 * The time-of-day badge above the question — the picker's only orientation cue,
 * so it carries the slot's own tint rather than the accent.
 */
export function SlotBadge({ icon, label, bg, fg }: { icon: Parameters<typeof Icon>[0]['name']; label: string; bg: string; fg: string }) {
  return (
    <View
      style={{
        flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start',
        paddingVertical: 6, paddingHorizontal: space.md,
        borderRadius: radius.pill, backgroundColor: bg,
      }}
    >
      <Icon name={icon} size={12} color={fg} weight="semibold" />
      <Txt variant="micro" color={fg}>{label.toUpperCase()}</Txt>
    </View>
  );
}
