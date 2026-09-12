import Animated, { useAnimatedStyle, useSharedValue, withTiming, useReducedMotion } from 'react-native-reanimated';
import { useEffect } from 'react';
import { Txt } from './Txt';
import { Icon } from './Icon';
import { PressScale, EASE } from './Press';
import { useTheme } from '../theme/useTheme';
import { radius, space, type TintName } from '../theme/tokens';
import type { Slot } from '../lib/time';
import type { SymbolViewProps } from 'expo-symbols';

export const SLOT_TINT: Record<Slot, TintName> = {
  anytime: 'stone', morning: 'peach', afternoon: 'rose', evening: 'lilac',
};

export const SLOT_ICON: Record<Slot, SymbolViewProps['name']> = {
  anytime: 'clock', morning: 'sunrise', afternoon: 'sun.max', evening: 'moon',
};

export function SlotChip({
  slot, label, count, expanded, onToggle,
}: { slot: Slot; label: string; count: number; expanded: boolean; onToggle: () => void }) {
  const theme = useTheme();
  const t = theme.tint(SLOT_TINT[slot]);
  const rot = useSharedValue(expanded ? 0 : -90);
  const reduced = useReducedMotion();

  useEffect(() => {
    rot.set(reduced ? (expanded ? 0 : -90) : withTiming(expanded ? 0 : -90, { duration: 200, easing: EASE }));
  }, [expanded, reduced, rot]);

  const chev = useAnimatedStyle(() => ({ transform: [{ rotate: `${rot.get()}deg` }] }));

  return (
    <PressScale
      onPress={onToggle}
      accessibilityRole="button"
      accessibilityLabel={`${label}, ${count} ${count === 1 ? 'activity' : 'activities'}`}
      accessibilityState={{ expanded }}
      style={{
        flexDirection: 'row', alignItems: 'center', gap: space.sm,
        alignSelf: 'flex-start',
        paddingVertical: 7, paddingHorizontal: space.md,
        borderRadius: radius.pill, backgroundColor: t.bg,
      }}
    >
      <Icon name={SLOT_ICON[slot]} size={13} color={t.fg} weight="semibold" />
      <Txt variant="micro" color={t.fg}>{label.toUpperCase()} ({count})</Txt>
      <Animated.View style={chev}>
        <Icon name="chevron.down" size={11} color={t.fg} weight="bold" />
      </Animated.View>
    </PressScale>
  );
}

export function SlotTint(slot: Slot): TintName { return SLOT_TINT[slot]; }

/** The dashed "nothing here yet" drop target under an empty slot. */
export function SlotEmpty({ hint, onPress }: { hint: string; onPress: () => void }) {
  const { c } = useTheme();
  return (
    <PressScale
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={hint}
      style={{
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        borderRadius: radius.card, borderCurve: 'continuous', borderWidth: 1.5, borderStyle: 'dashed',
        borderColor: c.hairline, paddingVertical: 14, paddingHorizontal: space.base,
      }}
    >
      <Txt variant="body" tone="faint">{hint}</Txt>
      <Icon name="plus" size={15} color={c.inkFaint} weight="semibold" />
    </PressScale>
  );
}
