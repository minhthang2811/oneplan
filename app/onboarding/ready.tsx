import { View } from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeIn, useReducedMotion } from 'react-native-reanimated';
import { OnboardingScaffold } from '../../src/components/OnboardingScaffold';
import { Bloom } from '../../src/components/Bloom';
import { PupuScene, PupuBubble } from '../../src/components/mascot/PupuScene';
import { space } from '../../src/theme/tokens';
import { useT } from '../../src/i18n';
import { haptic } from '../../src/lib/haptics';
import { usePlanStore } from '../../src/store/usePlanStore';

export default function Ready() {
  const complete = usePlanStore((s) => s.completeOnboarding);
  const { t } = useT();
  const reduced = useReducedMotion();

  return (
    <OnboardingScaffold
      step={5}
      title={t('onboarding.readyTitle')}
      subtitle={t('onboarding.readySubtitle')}
      ctaLabel={t('onboarding.readyCta')}
      // The last screen has no list and no controls — only Pupu and one line
      // from him — so it is the one place where "fill the column" means
      // CENTRE rather than stretch. See the block below.
      fill
      onCta={() => {
        haptic.success();
        // The one-way door. Flipping `onboarded` drops every onboarding entry
        // from history via Stack.Protected; the replace just avoids a visible
        // bounce through the anchor route on the way out.
        complete({});
        router.replace('/(tabs)/today');
      }}
    >
      {/* Pupu cheers, but there is deliberately NO confetti here. Finishing setup
          is not an achievement — nothing has been done yet, and a burst of
          celebration for answering five questions spends the gesture before the
          user has earned it. Confetti is kept for finishing a real focus
          session, so that the first time it fires it means something. */}
      {/*
        CENTRED IN WHAT IS LEFT, NOT STACKED UNDER THE TITLE.

        Pupu used to sit directly below the headline with a block of empty
        canvas under him, which put the one thing this screen is FOR up in the
        top third and left the bottom half of the phone blank. He is the
        payoff of the whole flow; he belongs on the optical centre of the
        screen, and at a size that says so. `justifyContent: 'center'` inside
        the scaffold's filling column is the whole mechanism — the leftover
        height is split above and below him instead of being dumped at the
        bottom.
      */}
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.lg }}>
        <View style={{ height: 248, alignItems: 'center', justifyContent: 'center' }}>
          {/* Dimming on an inner plain view — `entering` owns opacity. */}
          <Animated.View
            entering={reduced ? undefined : FadeIn.delay(120).duration(420)}
            style={{ position: 'absolute' }}
          >
            <View style={{ opacity: 0.5 }}>
              <Bloom scale={1.04} />
            </View>
          </Animated.View>
          <PupuScene pose="cheer" size={216} delay={120} idle="bob" />
        </View>
        <PupuBubble text={t('onboarding.readyBubble')} delay={520} />
      </View>
    </OnboardingScaffold>
  );
}
