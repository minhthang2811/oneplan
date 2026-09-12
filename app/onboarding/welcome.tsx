import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInDown, useReducedMotion } from 'react-native-reanimated';
import { router } from 'expo-router';
import { Txt } from '../../src/components/Txt';
import { Button } from '../../src/components/Button';
import { Bloom } from '../../src/components/Bloom';
import { useTheme } from '../../src/theme/useTheme';
import { space } from '../../src/theme/tokens';
import { haptic } from '../../src/lib/haptics';

export default function Welcome() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();

  return (
    <View style={{ flex: 1, backgroundColor: c.canvas, paddingHorizontal: space.lg }}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.huge }}>
        <Animated.View entering={reduced ? undefined : FadeIn.duration(500)}>
          <Bloom />
        </Animated.View>

        <Animated.View
          entering={reduced ? undefined : FadeInDown.delay(160).duration(420).springify().damping(18)}
          style={{ alignItems: 'center', gap: space.md }}
        >
          <Txt variant="displayLg" style={{ fontSize: 44, lineHeight: 50 }}>Oneplan</Txt>
          <Txt variant="body" tone="muted" style={{ textAlign: 'center', maxWidth: 280 }}>
            One day at a time, laid out so you can see it. Built for brains that
            do better with pictures than lists.
          </Txt>
        </Animated.View>
      </View>

      <View style={{ paddingBottom: Math.max(insets.bottom, space.base), gap: space.md }}>
        <Button
          label="Get started"
          onPress={() => { haptic.tap(); router.push('/onboarding/need'); }}
        />
        <Txt variant="caption" tone="faint" style={{ textAlign: 'center' }}>
          No account needed. Everything stays on your phone.
        </Txt>
      </View>
    </View>
  );
}
