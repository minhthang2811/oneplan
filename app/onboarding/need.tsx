import { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { OnboardingScaffold } from '../../src/components/OnboardingScaffold';
import { ChoiceRow } from '../../src/components/Button';
import { space } from '../../src/theme/tokens';
import { haptic } from '../../src/lib/haptics';
import { usePlanStore } from '../../src/store/usePlanStore';

const OPTIONS = [
  'Organise my day and time',
  'Remember my tasks',
  'Prioritise my to-dos',
  'Build and stick to routines',
  'Support focus work',
];

export default function Need() {
  const [picked, setPicked] = useState<string | null>(null);
  const setProfile = usePlanStore((s) => s.completeOnboarding);

  return (
    <OnboardingScaffold
      step={1}
      title={'What do you need\nmost right now?'}
      subtitle="So we can put the right thing on your first screen. You can change this later."
      ctaLabel="Continue"
      ctaDisabled={!picked}
      onCta={() => {
        haptic.tap();
        // Not the final commit — this only stashes the answer on the profile.
        usePlanStore.setState((s) => ({ profile: { ...s.profile, need: picked } }));
        router.push('/onboarding/rhythm');
      }}
    >
      <View style={{ gap: space.md }}>
        {OPTIONS.map((o) => (
          <ChoiceRow
            key={o}
            label={o}
            selected={picked === o}
            onPress={() => { haptic.tick(); setPicked(o); }}
          />
        ))}
      </View>
    </OnboardingScaffold>
  );
}
