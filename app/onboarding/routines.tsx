import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeInDown, FadeIn, useReducedMotion } from 'react-native-reanimated';
import { OnboardingScaffold } from '../../src/components/OnboardingScaffold';
import { RoutineChip, SlotBadge } from '../../src/components/RoutineChip';
import { SLOT_TINT, SLOT_ICON } from '../../src/components/SlotChip';
import { Txt } from '../../src/components/Txt';
import { useTheme } from '../../src/theme/useTheme';
import { space } from '../../src/theme/tokens';
import { haptic } from '../../src/lib/haptics';
import { SLOT_LABEL, formatDuration } from '../../src/lib/time';
import { usePlanStore } from '../../src/store/usePlanStore';
import { ROUTINES, ROUTINE_SLOTS, ROUTINE_COPY, type RoutineSlot } from '../../src/data/routines';

type Picks = Record<RoutineSlot, string[]>;

/**
 * Morning, afternoon and evening routines — three questions behind one route.
 *
 * Tiimo asks these as three consecutive screens, and asking one at a time is
 * right: a single page of thirty-six chips is precisely the wall of choice this
 * audience bounces off. But three real routes would also mean three entries in
 * the history stack for what is one decision, so the phases live in local state
 * and the progress bar advances by a third each time.
 *
 * Back therefore has to step backwards through the phases before it is allowed
 * to pop the route, which is what `onBack` on the scaffold is for.
 */
export default function Routines() {
  const theme = useTheme();
  const reduced = useReducedMotion();
  const applyRoutines = usePlanStore((s) => s.applyRoutines);

  const [phase, setPhase] = useState(0);
  const [picks, setPicks] = useState<Picks>({ morning: [], afternoon: [], evening: [] });

  const slot = ROUTINE_SLOTS[phase];
  const options = ROUTINES[slot];
  const chosen = picks[slot];
  const t = theme.tint(SLOT_TINT[slot]);
  const last = phase === ROUTINE_SLOTS.length - 1;

  const minutes = useMemo(
    () => options.filter((o) => chosen.includes(o.id)).reduce((n, o) => n + o.minutes, 0),
    [options, chosen]
  );

  const toggle = (id: string) => {
    haptic.tick();
    setPicks((p) => ({
      ...p,
      [slot]: p[slot].includes(id) ? p[slot].filter((x) => x !== id) : [...p[slot], id],
    }));
  };

  const commit = () => {
    applyRoutines(picks);
    router.push('/onboarding/reminders');
  };

  return (
    <OnboardingScaffold
      // Routines is step 3 of 5, and each phase moves the bar a third of the
      // way through that step rather than leaving it frozen for three screens.
      step={2 + (phase + 1) / ROUTINE_SLOTS.length}
      title={ROUTINE_COPY[slot].title}
      subtitle={ROUTINE_COPY[slot].subtitle}
      onBack={() => (phase === 0 ? router.back() : setPhase((p) => p - 1))}
      onSkip={() => { haptic.tap(); commit(); }}
      ctaLabel={last ? 'Continue with my routines' : 'Continue'}
      onCta={() => {
        haptic.tap();
        if (last) commit();
        else setPhase((p) => p + 1);
      }}
      headerSlot={
        // Keyed on the slot so the badge re-enters — and visibly re-tints —
        // every time the phase changes.
        <Animated.View key={slot} entering={reduced ? undefined : FadeIn.duration(260)}>
          <SlotBadge icon={SLOT_ICON[slot]} label={SLOT_LABEL[slot]} bg={t.bg} fg={t.fg} />
        </Animated.View>
      }
      footer={
        <Txt variant="caption" tone="faint" style={{ textAlign: 'center' }}>
          {chosen.length === 0
            ? 'Pick as many or as few as you like — you can skip this.'
            : `${chosen.length} picked · about ${formatDuration(minutes)}`}
        </Txt>
      }
    >
      {/* Remounting on `phase` is what replays the cascade. The chips are the
          content of the question, so they should arrive with it, not sit still
          while only the words above them change. */}
      <View key={slot} style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
        {options.map((o, i) => (
          <Animated.View
            key={o.id}
            entering={
              reduced
                ? undefined
                : FadeInDown.delay(i * 26).duration(300).springify().damping(17)
            }
          >
            <RoutineChip
              emoji={o.emoji}
              label={o.title}
              selected={chosen.includes(o.id)}
              onPress={() => toggle(o.id)}
            />
          </Animated.View>
        ))}
      </View>
    </OnboardingScaffold>
  );
}
