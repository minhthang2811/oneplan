import { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { OnboardingScaffold } from '../../src/components/OnboardingScaffold';
import { ChoiceRow } from '../../src/components/Button';
import { space } from '../../src/theme/tokens';
import { haptic } from '../../src/lib/haptics';
import { usePlanStore } from '../../src/store/usePlanStore';

const OPTIONS = [
  'Loose — morning, afternoon, evening',
  'Timed — everything on the clock',
  'A bit of both',
];

export default function Rhythm() {
  const [picked, setPicked] = useState<string | null>(null);
  const setLayout = usePlanStore((s) => s.setLayout);

  return (
    <OnboardingScaffold
      step={2}
      title={'How do you like\nto plan a day?'}
      subtitle="Some days need a timetable, some just need an order. Pick what usually works."
      ctaLabel="Continue"
      ctaDisabled={!picked}
      onCta={() => {
        haptic.tap();
        usePlanStore.setState((s) => ({ profile: { ...s.profile, rhythm: picked } }));
        setLayout(picked === OPTIONS[1] ? 'timeline' : 'compact');
        router.push('/onboarding/routines');
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
