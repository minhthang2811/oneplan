import { useEffect, useState } from 'react';
import { View, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, withTiming, withSequence,
  useReducedMotion,
} from 'react-native-reanimated';
/**
 * Structural type over only what this bar touches. Expo Router vendors
 * React Navigation under `build/`, and deep-importing that path breaks on
 * patch releases — three fields is a cheaper contract than a fragile import.
 */
export type TabBarProps = {
  state: { index: number; routes: Array<{ key: string; name: string }> };
  navigation: {
    // Returns React Navigation's EventArg. Typed as `unknown` and narrowed at
    // the call site so this structural type stays assignable from the real one.
    emit: (e: { type: 'tabPress' | 'tabLongPress'; target: string; canPreventDefault?: boolean }) => unknown;
    navigate: (name: string) => void;
  };
};
import type { SymbolViewProps } from 'expo-symbols';
import { Txt } from './Txt';
import { Icon } from './Icon';
import { CalendarDayIcon } from './CalendarDayIcon';
import { GlassPanel } from './Glass';
import { EASE } from './Press';
import { useTheme } from '../theme/useTheme';
import { radius, space } from '../theme/tokens';
import { haptic } from '../lib/haptics';

export const TAB_BAR_HEIGHT = 64;

const BAR_PAD = 6;
const CHIP_INSET = 4;

const ICONS: Record<string, SymbolViewProps['name']> = {
  todo: 'checkmark.square',
  focus: 'timer',
  me: 'face.smiling',
};

const LABELS: Record<string, string> = {
  todo: 'To-do', today: 'Today', focus: 'Focus', me: 'Me',
};

/**
 * A floating pane of glass rather than the system tab bar: it is the single
 * most recognisable piece of this product's chrome. It is still the real Tabs
 * navigator underneath — each tab keeps its own stack and re-tapping the active
 * tab pops it to root, because we emit `tabPress` properly.
 *
 * The selection chip SLIDES between tabs instead of cutting. On a translucent
 * bar the chip is the only thing that says which tab is live, so moving it
 * continuously is what ties the tap to the result; a chip that teleports reads
 * as two separate events. This is the one place the app animates a tab change,
 * and it is chrome moving within the bar, not a screen transition — the "tabs
 * never slide" rule is about the scenes, which still cut instantly.
 */
export function TabBar({ state, navigation }: TabBarProps) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const today = new Date().getDate();

  const count = state.routes.length;
  const [row, setRow] = useState(0);
  const itemW = row > 0 ? row / count : 0;

  const x = useSharedValue(0);
  useEffect(() => {
    if (itemW === 0) return;
    const target = state.index * itemW + CHIP_INSET;
    // The first layout must not animate in from zero, and Reduce Motion keeps
    // the chip but drops the travel.
    if (x.get() === 0 || reduced) x.set(target);
    else x.set(withSpring(target, { duration: 420, dampingRatio: 0.82 }));
  }, [state.index, itemW, reduced, x]);

  const chip = useAnimatedStyle(() => ({ transform: [{ translateX: x.get() }] }));

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute', left: 0, right: 0, bottom: 0,
        paddingBottom: Math.max(insets.bottom, space.md),
        paddingHorizontal: space.base,
      }}
    >
      <GlassPanel
        radius={radius.pill}
        contentStyle={{ height: TAB_BAR_HEIGHT, paddingHorizontal: BAR_PAD, justifyContent: 'center' }}
      >
        <View
          onLayout={(e) => setRow(e.nativeEvent.layout.width)}
          style={{ flexDirection: 'row', alignItems: 'center' }}
        >
          {itemW > 0 ? (
            <Animated.View
              pointerEvents="none"
              style={[
                {
                  position: 'absolute', left: 0,
                  width: itemW - CHIP_INSET * 2,
                  height: TAB_BAR_HEIGHT - 14,
                  borderRadius: radius.pill,
                  backgroundColor: c.glassChip,
                },
                chip,
              ]}
            />
          ) : null}

          {state.routes.map((route, i) => {
            const focused = state.index === i;
            const label = LABELS[route.name] ?? route.name;

            const onPress = () => {
              const event = navigation.emit({
                type: 'tabPress', target: route.key, canPreventDefault: true,
              }) as { defaultPrevented?: boolean };
              if (!focused && !event?.defaultPrevented) {
                haptic.tick();
                navigation.navigate(route.name);
              }
            };

            return (
              <Pressable
                key={route.key}
                onPress={onPress}
                onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })}
                accessibilityRole="tab"
                accessibilityState={{ selected: focused }}
                accessibilityLabel={label}
                style={{ flex: 1, height: TAB_BAR_HEIGHT, alignItems: 'center', justifyContent: 'center' }}
              >
                <TabItem name={route.name} label={label} focused={focused} day={today} reduced={reduced} />
              </Pressable>
            );
          })}
        </View>
      </GlassPanel>
    </View>
  );
}

/**
 * The icon lifts and settles when its tab becomes active. It is a 260ms
 * overshoot on a single glyph — enough to confirm the tap landed here, small
 * enough to survive being seen a hundred times a day.
 */
function TabItem({
  name, label, focused, day, reduced,
}: { name: string; label: string; focused: boolean; day: number; reduced: boolean }) {
  const { c } = useTheme();
  const lift = useSharedValue(1);

  useEffect(() => {
    if (!focused || reduced) return;
    lift.set(withSequence(
      withTiming(1.16, { duration: 130, easing: EASE }),
      withSpring(1, { duration: 320, dampingRatio: 0.6 })
    ));
  }, [focused, reduced, lift]);

  const anim = useAnimatedStyle(() => ({ transform: [{ scale: lift.get() }] }));

  // Active stays `ink`, not accent: on a translucent chip the accent loses the
  // contrast it holds on an opaque surface, and the chip already carries the
  // selection.
  const color = focused ? c.ink : c.inkFaint;

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', gap: 3 }}>
      <Animated.View style={anim}>
        {name === 'today' ? (
          <CalendarDayIcon size={21} color={color} day={day} />
        ) : (
          <Icon
            name={ICONS[name] ?? 'circle'}
            size={21}
            color={color}
            weight={focused ? 'semibold' : 'regular'}
          />
        )}
      </Animated.View>
      <Txt
        variant="micro"
        color={color}
        allowFontScaling={false}
        numberOfLines={1}
        style={{ letterSpacing: 0.1, fontSize: 10 }}
      >
        {label}
      </Txt>
    </View>
  );
}
