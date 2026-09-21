import { useState } from 'react';
import { router } from 'expo-router';
import { OnboardingScaffold } from '../../src/components/OnboardingScaffold';
import { ChoiceRow, OptionList } from '../../src/components/Button';
import type { TintName } from '../../src/theme/tokens';
import { useT, type TKey } from '../../src/i18n';
import { haptic } from '../../src/lib/haptics';
import { usePlanStore } from '../../src/store/usePlanStore';

/**
 * Stored as keys — see the note in `need.tsx`.
 *
 * ── THE LABEL IS NOW TWO LINES, AND THAT IS THE POINT ─────────────────────
 * These used to be single strings joined by an em-dash: "Loose — morning,
 * afternoon, evening". An em-dash in a button label is almost always a title
 * and a subtitle that have not been separated yet, and it shows: the line was
 * long enough to wrap on a phone, and wrapping put the two halves of it on
 * equal footing when one of them is the ANSWER and the other is a gloss.
 *
 * Split, the eye reads three short answers down the left edge and can take the
 * explanation or leave it — which is what the reference screens with a
 * secondary line (Udemy, Headway, Strava) are doing.
 */
const OPTIONS: { key: TKey; hint: TKey; emoji: string; tint: TintName }[] = [
  { key: 'onboarding.rhythmLoose', hint: 'onboarding.rhythmLooseSub', emoji: '🌤️', tint: 'peach' },
  { key: 'onboarding.rhythmTimed', hint: 'onboarding.rhythmTimedSub', emoji: '⏰', tint: 'sky' },
  // No `lilac` — see the note in `need.tsx`: it is the selection fill's own hue.
  { key: 'onboarding.rhythmBoth', hint: 'onboarding.rhythmBothSub', emoji: '🔀', tint: 'mint' },
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
      fill
      onCta={() => {
        haptic.tap();
        usePlanStore.setState((s) => ({ profile: { ...s.profile, rhythm: picked } }));
        setLayout(picked === OPTIONS[1].key ? 'timeline' : 'compact');
        router.push('/onboarding/routines');
      }}
    >
      <OptionList>
        {OPTIONS.map((o) => (
          <ChoiceRow
            key={o.key}
            grow
            emoji={o.emoji}
            tint={o.tint}
            label={t(o.key)}
            hint={t(o.hint)}
            selected={picked === o.key}
            onPress={() => { haptic.tick(); setPicked(o.key); }}
          />
        ))}
      </OptionList>
    </OnboardingScaffold>
  );
}
