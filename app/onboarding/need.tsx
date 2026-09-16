import { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { OnboardingScaffold } from '../../src/components/OnboardingScaffold';
import { ChoiceRow } from '../../src/components/Button';
import { space } from '../../src/theme/tokens';
import { useT, type TKey } from '../../src/i18n';
import { haptic } from '../../src/lib/haptics';
import { usePlanStore } from '../../src/store/usePlanStore';

/**
 * The answer is stored as its translation KEY, not as the sentence.
 *
 * "Me" reads this back as "Here to organise my day and time". Storing the
 * English words would leave that line stuck in English forever for anyone who
 * later switches the app to Vietnamese — the key follows the language instead.
 */
const OPTIONS: TKey[] = [
  'onboarding.needOrganise',
  'onboarding.needRemember',
  'onboarding.needPrioritise',
  'onboarding.needRoutines',
  'onboarding.needFocus',
];

export default function Need() {
  const [picked, setPicked] = useState<TKey | null>(null);
  const { t } = useT();

  return (
    <OnboardingScaffold
      step={1}
      title={t('onboarding.needTitle')}
      subtitle={t('onboarding.needSubtitle')}
      ctaLabel={t('common.continue')}
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
            label={t(o)}
            selected={picked === o}
            onPress={() => { haptic.tick(); setPicked(o); }}
          />
        ))}
      </View>
    </OnboardingScaffold>
  );
}
