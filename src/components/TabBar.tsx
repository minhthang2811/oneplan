import { View, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
import { useTheme } from '../theme/useTheme';
import { radius, space } from '../theme/tokens';
import { haptic } from '../lib/haptics';

export const TAB_BAR_HEIGHT = 64;

const ICONS: Record<string, SymbolViewProps['name']> = {
  todo: 'checkmark.square',
  focus: 'timer',
  me: 'face.smiling',
};

const LABELS: Record<string, string> = {
  todo: 'To-do', today: 'Today', focus: 'Focus', me: 'Me',
};

/**
 * A floating pill rather than the system tab bar: it is the single most
 * recognisable piece of this product's chrome. It is still the real Tabs
 * navigator underneath — each tab keeps its own stack and re-tapping the
 * active tab pops it to root, because we emit `tabPress` properly.
 */
export function TabBar({ state, navigation }: TabBarProps) {
  const { c, shadow } = useTheme();
  const insets = useSafeAreaInsets();
  const today = new Date().getDate();

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute', left: 0, right: 0, bottom: 0,
        paddingBottom: Math.max(insets.bottom, space.md),
        paddingHorizontal: space.base,
      }}
    >
      <View
        style={{
          flexDirection: 'row', alignItems: 'center',
          height: TAB_BAR_HEIGHT,
          borderRadius: radius.pill,
          backgroundColor: c.surfaceRaised,
          boxShadow: shadow[3],
          paddingHorizontal: 6,
        }}
      >
        {state.routes.map((route, i) => {
          const focused = state.index === i;
          const label = LABELS[route.name] ?? route.name;
          const color = focused ? c.ink : c.inkFaint;

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
              style={{ flex: 1, height: '100%', alignItems: 'center', justifyContent: 'center' }}
            >
              <View
                style={{
                  alignItems: 'center', justifyContent: 'center', gap: 3,
                  paddingVertical: space.sm, paddingHorizontal: space.base,
                  borderRadius: radius.input, borderCurve: 'continuous',
                  backgroundColor: focused ? c.surfaceSelected : 'transparent',
                  minWidth: 60,
                }}
              >
                {route.name === 'today' ? (
                  <CalendarDayIcon size={21} color={color} day={today} />
                ) : (
                  <Icon name={ICONS[route.name] ?? 'circle'} size={21} color={color} weight={focused ? 'semibold' : 'regular'} />
                )}
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
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
