import { View } from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeIn, useReducedMotion } from 'react-native-reanimated';
import { OnboardingScaffold } from '../../src/components/OnboardingScaffold';
import { Txt } from '../../src/components/Txt';
import { Bloom } from '../../src/components/Bloom';
import { space } from '../../src/theme/tokens';
import { haptic } from '../../src/lib/haptics';
import { usePlanStore } from '../../src/store/usePlanStore';

export default function Ready() {
  const complete = usePlanStore((s) => s.completeOnboarding);
  const reduced = useReducedMotion();

  return (
    <OnboardingScaffold
      step={4}
      title={'Your day is\nready to look at'}
      subtitle="We have put a starter day in for you. Change anything, delete anything — it is yours."
      ctaLabel="Start planning"
      onCta={() => {
        haptic.success();
        // The one-way door. Flipping `onboarded` drops every onboarding entry
        // from history via Stack.Protected; the replace just avoids a visible
        // bounce through the anchor route on the way out.
        complete({});
        router.replace('/(tabs)/today');
      }}
    >
      <Animated.View
        entering={reduced ? undefined : FadeIn.delay(120).duration(420)}
        style={{ alignItems: 'center', paddingTop: space.base }}
      >
        <Bloom scale={0.82} />
      </Animated.View>
      <View style={{ height: space.base }} />
    </OnboardingScaffold>
  );
}
