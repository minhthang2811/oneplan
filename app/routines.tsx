import { useMemo, useRef, useState } from 'react';
import { View, Pressable, TextInput, ActionSheetIOS, Alert } from 'react-native';
import Animated, { FadeIn, FadeOut, LinearTransition, useReducedMotion } from 'react-native-reanimated';
import { Txt } from '../src/components/Txt';
import { Icon } from '../src/components/Icon';
import { RoutineChip } from '../src/components/RoutineChip';
import { SLOT_TINT, SLOT_ICON } from '../src/components/SlotChip';
import { SettingsScreen, Section } from '../src/components/Settings';
import { PressScale } from '../src/components/Press';
import { PipScene } from '../src/components/mascot/PipScene';
import { useTheme } from '../src/theme/useTheme';
import { radius, space } from '../src/theme/tokens';
import {
  usePlanStore, routineCatalogue, routineSteps,
} from '../src/store/usePlanStore';
import { ROUTINE_SLOTS, ROUTINE_PARENT, type RoutineSlot } from '../src/data/routines';
import { slotLabel, formatDuration, formatClock } from '../src/lib/time';
import { translate } from '../src/i18n';
import { haptic } from '../src/lib/haptics';

/** The start times worth offering per slot. A full clock picker is a lot of
 *  machinery for a decision that is really "early, usual, or late". */
const TIME_CHOICES: Record<RoutineSlot, number[]> = {
  morning: [6 * 60, 7 * 60, 8 * 60, 9 * 60, 10 * 60],
  afternoon: [12 * 60, 13 * 60, 14 * 60, 15 * 60, 16 * 60],
  evening: [18 * 60, 19 * 60, 20 * 60, 21 * 60, 22 * 60],
};

/**
 * ROUTINES, after onboarding.
 *
 * Onboarding asks these three questions once and then never again, which is
 * the wrong shape for the thing it is asking about: a routine is the part of a
 * day that changes most often — a new job moves the morning, a new flatmate
 * moves the evening — and until now the only way to change one was to run the
 * whole five-step onboarding again from the Me tab.
 *
 * ── WHY THIS IS ONE SCREEN AND NOT THREE ───────────────────────────────────
 * Onboarding deliberately asks one slot at a time, because a page of
 * thirty-six chips is the wall of choice this audience bounces off. That is
 * right for a FIRST run, where the user has no idea what they are building.
 * It is wrong here: someone arriving at this screen has a specific edit in
 * mind, usually to one slot, and making them page through the other two to
 * reach it is the thing that would stop them bothering. So all three are here,
 * collapsed, and opening one is the whole navigation.
 *
 * ── THE ORDER IS THE PRODUCT ───────────────────────────────────────────────
 * The routines flow promises "we will keep them in this order so you do not
 * have to". Until now the order was the CATALOGUE's, because the picks were
 * applied by filtering it — so a user who chose shower-then-coffee got
 * coffee-then-shower, silently, because that is how the array happened to be
 * written. The sequence is now stored and editable, and it is the first thing
 * this screen lets you touch.
 */
export default function Routines() {
  const profile = usePlanStore((s) => s.profile);
  const syncRoutines = usePlanStore((s) => s.syncRoutines);
  const [open, setOpen] = useState<RoutineSlot | null>(null);

  const total = useMemo(
    () => ROUTINE_SLOTS.reduce((n, slot) => n + routineSteps(profile, slot).length, 0),
    [profile]
  );

  /**
   * EVERY EDIT WRITES STRAIGHT THROUGH TO TODAY.
   *
   * There is no Save button, and that is a decision rather than an omission.
   * A routine is not a document — it is a description of what you do, and the
   * only way to know whether a change is right is to look at the day it
   * produces. A staged edit with a Save would mean the preview under each slot
   * showed something that was not true yet, which is the one thing a preview
   * must never do.
   *
   * `syncRoutines` carries today's completed steps across, so editing a
   * routine at eleven in the morning does not hand back the three things you
   * have already done as undone. That is what makes writing through safe.
   */
  const commit = (slot: RoutineSlot, fn: () => void) => { fn(); syncRoutines(slot); };

  return (
    <SettingsScreen
      title={translate('routines.title')}
      subtitle={translate('routines.subtitle')}
    >
      {total === 0 ? <EmptyRoutines /> : null}

      {ROUTINE_SLOTS.map((slot) => (
        <SlotEditor
          key={slot}
          slot={slot}
          open={open === slot}
          onToggleOpen={() => {
            haptic.tap();
            setOpen((o) => (o === slot ? null : slot));
          }}
          commit={(fn) => commit(slot, fn)}
        />
      ))}

      <Txt variant="caption" tone="faint" style={{ textAlign: 'center' }}>
        {translate('routines.applyNote')}
      </Txt>
    </SettingsScreen>
  );
}

function EmptyRoutines() {
  const { c } = useTheme();
  return (
    <View
      style={{
        alignItems: 'center', gap: space.md, paddingVertical: space.lg,
        borderRadius: radius.card, borderCurve: 'continuous',
        borderWidth: 1.5, borderStyle: 'dashed', borderColor: c.hairline,
      }}
    >
      {/* Pip cheering is right here and a dozing Pip would not be: an empty
          routines screen is an invitation, not a day with nothing in it. */}
      <PipScene pose="cheer" size={112} idle="bob" delay={120} />
      <View style={{ alignItems: 'center', gap: space.xs, paddingHorizontal: space.lg }}>
        <Txt variant="bodyStrong">{translate('routines.none')}</Txt>
        <Txt variant="caption" tone="muted" style={{ textAlign: 'center' }}>
          {translate('routines.emptyHint')}
        </Txt>
      </View>
    </View>
  );
}

function SlotEditor({
  slot, open, onToggleOpen, commit,
}: {
  slot: RoutineSlot;
  open: boolean;
  onToggleOpen: () => void;
  commit: (fn: () => void) => void;
}) {
  const theme = useTheme();
  const { c } = theme;
  const reduced = useReducedMotion();

  const profile = usePlanStore((s) => s.profile);
  const toggleStep = usePlanStore((s) => s.toggleRoutineStep);
  const moveStep = usePlanStore((s) => s.moveRoutineStep);
  const addStep = usePlanStore((s) => s.addRoutineStep);
  const setTime = usePlanStore((s) => s.setRoutineTime);

  const chosen = routineSteps(profile, slot);
  const catalogue = routineCatalogue(profile, slot);
  const chosenIds = new Set(chosen.map((o) => o.id));
  const minutes = chosen.reduce((n, o) => n + o.minutes, 0);
  const startsAt = profile.routineTimes?.[slot] ?? ROUTINE_PARENT[slot].startMinutes;
  const t = theme.tint(SLOT_TINT[slot]);

  const pickTime = () => {
    haptic.tap();
    const choices = TIME_CHOICES[slot];
    const labels = choices.map(formatClock);
    if (process.env.EXPO_OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: [...labels, translate('common.cancel')],
          cancelButtonIndex: labels.length,
          title: translate('routines.startPrompt', { slot: slotLabel(slot).toLowerCase() }),
          userInterfaceStyle: theme.isDark ? 'dark' : 'light',
        },
        (i) => { if (i < choices.length) commit(() => setTime(slot, choices[i])); }
      );
    } else {
      Alert.alert(
        translate('routines.startPrompt', { slot: slotLabel(slot).toLowerCase() }),
        undefined,
        [
          ...choices.map((m) => ({ text: formatClock(m), onPress: () => commit(() => setTime(slot, m)) })),
          { text: translate('common.cancel'), style: 'cancel' as const },
        ]
      );
    }
  };

  return (
    <View style={{ gap: space.sm }}>
      <Pressable
        onPress={onToggleOpen}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={
          translate('routines.a11yRow', {
            slot: slotLabel(slot),
            summary: chosen.length === 0
              ? translate('routines.nothingPickedLower')
              : translate('routines.a11ySummary', {
                  count: chosen.length,
                  duration: formatDuration(minutes),
                  time: formatClock(startsAt),
                }),
          })
        }
        style={{
          flexDirection: 'row', alignItems: 'center', gap: space.md,
          padding: space.base,
          borderRadius: radius.card, borderCurve: 'continuous',
          backgroundColor: c.surface, boxShadow: theme.shadow[1],
        }}
      >
        <View
          style={{
            width: 38, height: 38, borderRadius: 19, backgroundColor: t.bg,
            alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Icon name={SLOT_ICON[slot]} size={17} color={t.fg} weight="semibold" />
        </View>
        <View style={{ flex: 1, gap: 1 }}>
          <Txt variant="bodyStrong">{slotLabel(slot)}</Txt>
          <Txt variant="caption" tone="muted">
            {chosen.length === 0
              ? translate('routines.nothingPicked')
              : translate('routines.summary', {
                  count: chosen.length,
                  duration: formatDuration(minutes),
                  time: formatClock(startsAt),
                })}
          </Txt>
        </View>
        <Icon name={open ? 'chevron.up' : 'chevron.down'} size={12} color={c.inkFaint} weight="bold" />
      </Pressable>

      {open ? (
        <Animated.View
          entering={reduced ? undefined : FadeIn.duration(200)}
          exiting={reduced ? undefined : FadeOut.duration(140)}
          style={{ gap: space.base }}
        >
          <Section
            title={translate('routines.inThisRoutine')}
            footer={translate('routines.orderFooter')}
          >
            {chosen.length === 0 ? (
              <View style={{ padding: space.base }}>
                <Txt variant="caption" tone="faint">
                  {translate('routines.emptyList')}
                </Txt>
              </View>
            ) : (
              chosen.map((o, i) => (
                <Animated.View
                  key={o.id}
                  // The list REORDERS, so the rows have to animate between
                  // positions rather than jumping. Without this a move reads as
                  // two rows blinking rather than as one row travelling, and
                  // the user cannot tell which one they actually moved.
                  layout={reduced ? undefined : LinearTransition.duration(220)}
                  style={{
                    flexDirection: 'row', alignItems: 'center', gap: space.sm,
                    paddingHorizontal: space.base, paddingVertical: 10,
                    borderTopWidth: i === 0 ? 0 : 1, borderTopColor: c.hairline,
                  }}
                >
                  <Txt variant="micro" tone="faint" tabular style={{ width: 16 }}>{i + 1}</Txt>
                  <Txt variant="body" style={{ fontSize: 17 }}>{o.emoji}</Txt>
                  <View style={{ flex: 1 }}>
                    <Txt variant="body" numberOfLines={1}>{o.title}</Txt>
                    <Txt variant="caption" tone="faint" tabular>{formatDuration(o.minutes)}</Txt>
                  </View>

                  <StepButton
                    icon="chevron.up"
                    label={translate('routines.moveEarlier', { title: o.title })}
                    disabled={i === 0}
                    onPress={() => commit(() => moveStep(slot, o.id, -1))}
                  />
                  <StepButton
                    icon="chevron.down"
                    label={translate('routines.moveLater', { title: o.title })}
                    disabled={i === chosen.length - 1}
                    onPress={() => commit(() => moveStep(slot, o.id, 1))}
                  />
                  <StepButton
                    icon="minus"
                    label={translate('routines.remove', { title: o.title })}
                    onPress={() => commit(() => toggleStep(slot, o.id))}
                  />
                </Animated.View>
              ))
            )}
          </Section>

          <View style={{ gap: space.sm }}>
            <Txt variant="micro" tone="faint">ADD SOMETHING</Txt>
            {/* The same chips as onboarding, so the two surfaces teach the same
                gesture. Selection is fill plus a redundant tick — never colour
                alone. */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
              {catalogue.map((o) => (
                <RoutineChip
                  key={o.id}
                  emoji={o.emoji}
                  label={o.title}
                  selected={chosenIds.has(o.id)}
                  onPress={() => { haptic.tick(); commit(() => toggleStep(slot, o.id)); }}
                />
              ))}
            </View>
          </View>

          <CustomStep onAdd={(title) => commit(() => addStep(slot, { title, emoji: '✨', minutes: 10 }))} />

          <Section title={translate('routines.startsAt')}>
            <Pressable
              onPress={pickTime}
              accessibilityRole="button"
              accessibilityLabel={translate('routines.a11yStartTime', { time: formatClock(startsAt) })}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: space.md,
                paddingHorizontal: space.base, paddingVertical: 14, minHeight: 54,
              }}
            >
              <Icon name="clock" size={17} color={c.inkMuted} />
              <Txt variant="body" style={{ flex: 1 }}>{translate('routines.startTime')}</Txt>
              <Txt variant="body" tone="muted" tabular>{formatClock(startsAt)}</Txt>
              <Icon name="chevron.right" size={12} color={c.inkFaint} weight="semibold" />
            </Pressable>
          </Section>
        </Animated.View>
      ) : null}
    </View>
  );
}

function StepButton({
  icon, label, onPress, disabled,
}: {
  icon: Parameters<typeof Icon>[0]['name'];
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  const { c } = useTheme();
  return (
    <PressScale
      onPress={() => { haptic.tick(); onPress(); }}
      disabled={disabled}
      hitSlop={4}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      style={{
        width: 30, height: 30, borderRadius: 15,
        alignItems: 'center', justifyContent: 'center',
        backgroundColor: c.surfaceSunken,
        opacity: disabled ? 0.35 : 1,
      }}
    >
      <Icon name={icon} size={12} color={c.inkMuted} weight="bold" />
    </PressScale>
  );
}

/**
 * Free-text step entry.
 *
 * Uncontrolled, and the authoritative value lives in a REF rather than state —
 * the same trap the To-do composer documents: React state lags the native
 * input by a render, so committing from state truncates what a fast typist
 * just wrote.
 */
function CustomStep({ onAdd }: { onAdd: (title: string) => void }) {
  const { c } = useTheme();
  const valueRef = useRef('');
  const [resetKey, setResetKey] = useState(0);

  const commit = (text?: string) => {
    const v = (text ?? valueRef.current).trim();
    if (!v) return;
    valueRef.current = '';
    setResetKey((k) => k + 1);
    haptic.success();
    onAdd(v);
  };

  return (
    <View
      style={{
        flexDirection: 'row', alignItems: 'center', gap: space.sm,
        borderRadius: radius.card, borderCurve: 'continuous',
        borderWidth: 1.5, borderStyle: 'dashed', borderColor: c.hairline,
        paddingHorizontal: space.base, minHeight: 48,
      }}
    >
      <TextInput
        key={resetKey}
        onChangeText={(t) => { valueRef.current = t; }}
        onSubmitEditing={(e) => commit(e.nativeEvent.text)}
        placeholder={translate('routines.ownPlaceholder')}
        placeholderTextColor={c.inkFaint}
        returnKeyType="done"
        submitBehavior="submit"
        accessibilityLabel={translate('routines.addOwn')}
        style={{
          flex: 1, color: c.ink, paddingVertical: space.md,
          fontFamily: 'Inter_400Regular', fontSize: 15,
        }}
      />
      <PressScale
        onPress={() => commit()}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={translate('routines.addStep')}
        style={{ padding: 6 }}
      >
        <Icon name="plus" size={15} color={c.inkFaint} weight="semibold" />
      </PressScale>
    </View>
  );
}
