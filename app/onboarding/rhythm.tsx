import { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { OnboardingScaffold } from '../../src/components/OnboardingScaffold';
import { ChoiceRow } from '../../src/components/Button';
import { space } from '../../src/theme/tokens';
import { useT, type TKey } from '../../src/i18n';
import { haptic } from '../../src/lib/haptics';
import { usePlanStore } from '../../src/store/usePlanStore';

/** Stored as keys — see the note in `need.tsx`. */
const OPTIONS: TKey[] = [
  'onboarding.rhythmLoose',
  'onboarding.rhythmTimed',
  'onboarding.rhythmBoth',
];

export default function Rhythm() {
  const [picked, setPicked] = useState<TKey | null>(null);
  const { t } = useT();
  const setLayout = usePlanStore((s) => s.setLayout);

  return (
    <OnboardingScaffold
      step={2}
      title={t('onboarding.rhythmTitle')}
      subtitle={t('onboarding.rhythmSubtitle')}
      ctaLabel={t('common.continue')}
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
            label={t(o)}
            selected={picked === o}
            onPress={() => { haptic.tick(); setPicked(o); }}
          />
        ))}
      </View>
    </OnboardingScaffold>
  );
}
