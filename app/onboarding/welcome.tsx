import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInDown, useReducedMotion } from 'react-native-reanimated';
import { router } from 'expo-router';
import { Txt } from '../../src/components/Txt';
import { Button } from '../../src/components/Button';
import { Bloom } from '../../src/components/Bloom';
import { PipScene } from '../../src/components/mascot/PipScene';
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
        {/* Pip stands IN FRONT of the brand mark rather than replacing it. The
            Bloom is built from the same tint palette the tasks use, so keeping
            it behind him says the character and the data belong to one system —
            and it drops to a backdrop opacity so it reads as the ground he is
            sitting on rather than as a second thing to look at. */}
        <View style={{ height: 250, alignItems: 'center', justifyContent: 'center' }}>
          {/* The dimming lives on an INNER plain view. `entering` is a layout
              animation and drives opacity itself, so an opacity in the animated
              view's own style is overwritten by it — the backdrop rendered at
              full strength and Reanimated warned about it on every mount. */}
          <Animated.View
            entering={reduced ? undefined : FadeIn.duration(500)}
            style={{ position: 'absolute' }}
          >
            <View style={{ opacity: 0.5 }}>
              <Bloom scale={1.06} />
            </View>
          </Animated.View>
          <PipScene pose="sit" size={208} delay={140} idle="breathe" />
        </View>

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
