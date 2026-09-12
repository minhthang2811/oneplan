import { View } from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeIn, useReducedMotion } from 'react-native-reanimated';
import { OnboardingScaffold } from '../../src/components/OnboardingScaffold';
import { Bloom } from '../../src/components/Bloom';
import { PipScene, PipBubble } from '../../src/components/mascot/PipScene';
import { space } from '../../src/theme/tokens';
import { haptic } from '../../src/lib/haptics';
import { usePlanStore } from '../../src/store/usePlanStore';

export default function Ready() {
  const complete = usePlanStore((s) => s.completeOnboarding);
  const reduced = useReducedMotion();

  return (
    <OnboardingScaffold
      step={5}
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
      {/* Pip cheers, but there is deliberately NO confetti here. Finishing setup
          is not an achievement — nothing has been done yet, and a burst of
          celebration for answering five questions spends the gesture before the
          user has earned it. Confetti is kept for finishing a real focus
          session, so that the first time it fires it means something. */}
      <View style={{ alignItems: 'center', paddingTop: space.sm, gap: space.base }}>
        <View style={{ height: 210, alignItems: 'center', justifyContent: 'center' }}>
          {/* Dimming on an inner plain view — `entering` owns opacity. */}
          <Animated.View
            entering={reduced ? undefined : FadeIn.delay(120).duration(420)}
            style={{ position: 'absolute' }}
          >
            <View style={{ opacity: 0.5 }}>
              <Bloom scale={0.9} />
            </View>
          </Animated.View>
          <PipScene pose="cheer" size={182} delay={120} idle="bob" grounded={false} />
        </View>
        <PipBubble text="Right then. Let's have a look at it." delay={520} />
      </View>
      <View style={{ height: space.base }} />
    </OnboardingScaffold>
  );
}
