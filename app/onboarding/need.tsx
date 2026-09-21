import { useState } from 'react';
import { router } from 'expo-router';
import { OnboardingScaffold } from '../../src/components/OnboardingScaffold';
import { ChoiceRow, OptionList } from '../../src/components/Button';
import type { TintName } from '../../src/theme/tokens';
import { useT, type TKey } from '../../src/i18n';
import { haptic } from '../../src/lib/haptics';
import { usePlanStore } from '../../src/store/usePlanStore';

/**
 * The answer is stored as its translation KEY, not as the sentence.
 *
 * "Me" reads this back as "Here to organise my day and time". Storing the
 * English words would leave that line stuck in English forever for anyone who
 * later switches the app to Vietnamese — the key follows the language instead.
 *
 * The emoji and tint live HERE rather than in the catalogue for the same reason
 * the routine catalogue keeps them out of the i18n files: they are not words,
 * they do not change with the language, and a translator should never be handed
 * a row they can accidentally break. Each pair is chosen to be the activity the
 * answer will actually produce — someone who picks "build routines" is shown
 * the repeat glyph they will meet again two screens later.
 *
 * ── NO `lilac` ON A SCREEN WITH A SELECTION FILL ──────────────────────────
 * `accentSoft` is a pale lilac, and it is what a chosen row is filled with. A
 * lilac avatar on it loses its disc entirely: the emoji ends up floating on the
 * card with no ground under it, on the one row the user has just told us they
 * care about. The other five hues all hold their edge against that fill, so the
 * rule is simply to spend them instead.
 */
const OPTIONS: { key: TKey; emoji: string; tint: TintName }[] = [
  { key: 'onboarding.needOrganise', emoji: '🗓️', tint: 'sky' },
  { key: 'onboarding.needRemember', emoji: '🧠', tint: 'rose' },
  { key: 'onboarding.needPrioritise', emoji: '🎯', tint: 'peach' },
  { key: 'onboarding.needRoutines', emoji: '🔁', tint: 'mint' },
  { key: 'onboarding.needFocus', emoji: '🎧', tint: 'butter' },
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
      fill
      onCta={() => {
        haptic.tap();
        // Not the final commit — this only stashes the answer on the profile.
        usePlanStore.setState((s) => ({ profile: { ...s.profile, need: picked } }));
        router.push('/onboarding/rhythm');
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
            selected={picked === o.key}
            onPress={() => { haptic.tick(); setPicked(o.key); }}
          />
        ))}
      </OptionList>
    </OnboardingScaffold>
  );
}
