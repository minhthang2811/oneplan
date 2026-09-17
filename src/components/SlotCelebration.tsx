import { useCallback, useEffect, useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useFocusEffect } from 'expo-router';
import Animated, {
  useAnimatedStyle, useSharedValue, withDelay, withSpring, withTiming,
  useReducedMotion, interpolate, Extrapolation, runOnJS,
} from 'react-native-reanimated';
import { Txt } from './Txt';
import { Icon } from './Icon';
import { EASE } from './Press';
import { SLOT_TINT, SLOT_ICON } from './SlotChip';
import { PupuScene, Confetti } from './mascot/PupuScene';
import { useTheme } from '../theme/useTheme';
import { radius, space, motion } from '../theme/tokens';
import { slotLabel, type Slot } from '../lib/time';
import { translate, type TKey } from '../i18n';
import { haptic } from '../lib/haptics';

/** How long the finished frame is held after the burst has gone. */
const LINGER = 900;

/** How far the pieces fall. Tall enough to clear the card and keep going. */
const BURST_HEIGHT = 460;

/**
 * THE GROUP-COMPLETION BURST.
 *
 * Finishing one activity already has a performance — the checkbox draws its
 * tick and throws eight marks out. Finishing an entire morning is a different
 * size of event, and until now it looked exactly like finishing the last thing
 * in it: the day's shape changed and nothing said so.
 *
 * ── WHY THIS IS ALLOWED TO BE BIG ──────────────────────────────────────────
 * DESIGN.md's frequency gate is the whole argument. A task is completed tens of
 * times a day and gets a 500ms flourish on a 26pt control. A time-of-day block
 * completes at most three times a day, is genuinely the thing the user came
 * here to do, and is rare enough to afford the mascot and the confetti — the
 * same tier as the focus-session finish.
 *
 * It is also the tier that makes the mascot worth having at all: Pupu is absent
 * from every screen you look at repeatedly, precisely so that the few places he
 * does appear still mean something.
 *
 * ── IT NEVER BLOCKS ────────────────────────────────────────────────────────
 * `pointerEvents="none"` throughout, and it dismisses itself. A celebration
 * that has to be acknowledged is a modal, and a modal between someone and the
 * next thing on their list is a punishment for finishing. The user can carry
 * straight on ticking things off underneath it.
 */
export function SlotCelebration({
  slot, onDone,
}: {
  slot: Exclude<Slot, 'anytime'>;
  onDone: () => void;
}) {
  const theme = useTheme();
  const { c } = theme;
  const reduced = useReducedMotion();
  const t = theme.tint(SLOT_TINT[slot]);

  /** 0 → 1 in, then back to 0 on the way out. */
  const v = useSharedValue(0);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    haptic.success();
    v.set(reduced ? withTiming(1, { duration: motion.enter }) : withSpring(1, motion.launch.wake));
  }, [v, reduced]);

  /**
   * The exit is driven by the CONFETTI's own completion rather than by a
   * second timer. Two timers that have to agree is how a celebration ends up
   * fading out while its own confetti is still falling — and `Confetti` fires
   * `onDone` under Reduce Motion too, where it renders nothing at all, which
   * is what stops this overlay from becoming permanent for exactly the users
   * least able to dismiss it.
   */
  const leave = useCallback(() => {
    setLeaving(true);
    v.set(
      withDelay(
        LINGER,
        withTiming(0, { duration: motion.exit, easing: EASE }, (done) => {
          'worklet';
          // `runOnJS`, because this callback runs on the UI runtime and
          // `onDone` is an ordinary React setter that lives on the JS one.
          // Calling it directly throws "Tried to synchronously call a Remote
          // Function" — and it throws at the END of the celebration, which is
          // the one moment nobody is looking at the code any more.
          if (done) runOnJS(onDone)();
        })
      )
    );
  }, [v, onDone]);

  /**
   * THE DEADMAN SWITCH, for the same reason the launch screen has one.
   *
   * The exit hands over from an animation callback guarded by `if (done)`,
   * which is right for a completed animation and SILENT for a cancelled one.
   * This overlay does not block touches and hides itself from assistive
   * technology, so one that never unmounted would sit invisibly over the day
   * forever while every assertion about the screen still passed.
   */
  useEffect(() => {
    const t = setTimeout(onDone, 6000);
    return () => clearTimeout(t);
  }, [onDone]);

  const scrim = useAnimatedStyle(() => ({ opacity: 0.55 * v.get() }));

  const card = useAnimatedStyle(() => {
    const p = v.get();
    if (reduced) return { opacity: p, transform: [] };
    return {
      opacity: Math.min(1, p * 2),
      transform: [
        { translateY: interpolate(p, [0, 1], [26, 0], Extrapolation.CLAMP) },
        { scale: 0.84 + 0.16 * Math.min(p, 1) },
      ],
    };
  });

  return (
    <View
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
      /*
       * Announced, not hidden.
       *
       * Pupu and the confetti are decoration and stay hidden, but the FACT that
       * a whole time of day is finished is information — it is the single
       * biggest thing that has happened on this screen, and a VoiceOver user
       * who has just ticked the last box otherwise gets no more feedback than
       * for the first. `alert` posts it without moving focus, so it is heard
       * without interrupting what the user is doing.
       */
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
      accessibilityLabel={translate('celebration.a11y', {
        slot: slotLabel(slot),
        slotLower: slotLabel(slot).toLowerCase(),
      })}
      testID="slot-celebration"
    >
      {/* A scrim, not a blur: this sits over a FlashList that is still
          scrolling underneath, and a blur of moving content is the one case
          where the material costs real frame time for no legibility gain. */}
      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { backgroundColor: c.scrim }, scrim]}
      />

      <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
        <Animated.View
          pointerEvents="none"
          style={[
            {
              alignItems: 'center', gap: space.md,
              paddingHorizontal: space.xl, paddingVertical: space.lg,
              borderRadius: radius.sheet, borderCurve: 'continuous',
              backgroundColor: c.surface, boxShadow: theme.shadow[3],
              maxWidth: 300,
            },
            card,
          ]}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          <View style={{ height: 150, alignItems: 'center', justifyContent: 'center' }}>
            <PupuScene pose="cheer" size={136} idle="bob" delay={60} />
          </View>

          <View
            style={{
              flexDirection: 'row', alignItems: 'center', gap: space.sm,
              paddingVertical: 6, paddingHorizontal: space.md,
              borderRadius: radius.pill, backgroundColor: t.bg,
            }}
          >
            <Icon name={SLOT_ICON[slot]} size={13} color={t.fg} weight="semibold" />
            <Txt variant="micro" color={t.fg}>
              {translate('celebration.badge', { slot: slotLabel(slot).toUpperCase() })}
            </Txt>
          </View>

          <Txt variant="displaySm" style={{ textAlign: 'center' }}>
            {translate(COPY[slot])}
          </Txt>
        </Animated.View>
      </View>

      {/*
        THE BURST GOES OVER THE CARD, NOT INSIDE IT.

        It started inside, above Pupu, and was almost invisible: the pieces are
        painted from `TINTS`, which in light mode are pastels, and a pastel on a
        white `surface` has nothing to read against. Narrowing the burst to keep
        the pieces from leaving the card only made it worse — it concentrated
        them on the one background they could not be seen on.

        Bursting across the whole overlay puts them over the scrim instead,
        which is dark in both themes and is what the palette actually has
        contrast against. It is also simply what a burst is: confetti goes over
        the room, not inside a box in it. Rendered after the card so the pieces
        pass in FRONT of Pupu rather than behind him.
      */}
      {!leaving ? (
        <View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}
        >
          <View style={{ alignSelf: 'stretch', height: BURST_HEIGHT }}>
            <Confetti height={BURST_HEIGHT} onDone={leave} />
          </View>
        </View>
      ) : null}
    </View>
  );
}

/**
 * One line per slot, and none of them congratulate the user on being good.
 *
 * The audience for this app is people who struggle to start, which means the
 * failure mode of celebration copy is making the NEXT block feel like a
 * standard to live up to. Each of these says the block is finished and stops.
 */
const COPY: Record<Exclude<Slot, 'anytime'>, TKey> = {
  morning: 'celebration.morning',
  afternoon: 'celebration.afternoon',
  evening: 'celebration.evening',
};

/**
 * Watches a day's slots and reports the moment one becomes complete.
 *
 * ── THE HARD PART IS NOT FIRING ────────────────────────────────────────────
 * Three things make a slot look newly-complete when it is not, and all three
 * would put confetti on screen for something the user did not just do:
 *
 *   1. ARRIVING at a day that is already finished. The first observation of
 *      any day is a baseline, never an event — so the very first pass only
 *      records, and `seen` starts as null to make "no baseline yet"
 *      representable rather than guessed.
 *   2. CHANGING DATE. Yesterday's finished morning is not a completion; the
 *      baseline is dropped and re-taken whenever the day key changes.
 *   3. AN EMPTY SLOT. `every()` is vacuously true on an empty array, so a slot
 *      with nothing in it reports itself complete forever. It has to have
 *      something in it to have finished.
 *   4. THE SCREEN BEING BLURRED. Today stays mounted under a pushed screen and
 *      the plan can change from one — see the note on `focused` below.
 */
export function useSlotCompletion(
  dayKey: string,
  complete: Record<Exclude<Slot, 'anytime'>, boolean>
): { celebrating: Exclude<Slot, 'anytime'> | null; dismiss: () => void } {
  const [celebrating, setCelebrating] = useState<Exclude<Slot, 'anytime'> | null>(null);
  const seen = useRef<{ key: string; state: Record<string, boolean> } | null>(null);

  /**
   * ── 4. THE SCREEN IS NOT BEING LOOKED AT ─────────────────────────────────
   * Today stays mounted under a pushed screen, and the plan can change from
   * one: emptying the last outstanding step of a routine from the Routines
   * editor rolls its parent up, which completes the slot. Without this the
   * celebration fired behind that screen — a success haptic with no
   * explanation, and the app's rarest moment spent where nobody could see it.
   *
   * Blurred is treated exactly like arriving: the baseline is still recorded
   * below, so coming back to a day that finished while you were away is a
   * state, not an event. That is the same rule as 1 and 2.
   */
  const [focused, setFocused] = useState(true);
  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => setFocused(false);
    }, [])
  );

  useEffect(() => {
    const prev = seen.current;
    seen.current = { key: dayKey, state: complete };

    // No baseline, or a baseline for a different day — record and say nothing.
    if (!prev || prev.key !== dayKey || !focused) return;

    for (const slot of ['morning', 'afternoon', 'evening'] as const) {
      if (complete[slot] && !prev.state[slot]) {
        setCelebrating(slot);
        return;
      }
    }
  }, [dayKey, complete, focused]);

  const dismiss = useCallback(() => setCelebrating(null), []);
  return { celebrating, dismiss };
}
