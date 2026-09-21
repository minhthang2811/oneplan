import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { View, ScrollView, Pressable, ActionSheetIOS, Alert, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue, useAnimatedStyle, useDerivedValue, useAnimatedReaction,
  withTiming, withSpring, cancelAnimation, Easing, FadeInDown,
  useReducedMotion, type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Txt } from '../../src/components/Txt';
import { Icon } from '../../src/components/Icon';
import { Ring } from '../../src/components/Ring';
import { Halo } from '../../src/components/Halo';
import { Checkbox } from '../../src/components/Checkbox';
import { Strike } from '../../src/components/Strike';
import { EmojiAvatar } from '../../src/components/EmojiAvatar';
import { PressScale } from '../../src/components/Press';
import { PupuScene, Confetti } from '../../src/components/mascot/PupuScene';
import { TAB_BAR_HEIGHT } from '../../src/components/TabBar';
import { FocusAura } from '../../src/components/FocusAura';
import { BotanicalBackdrop } from '../../src/components/BotanicalBackdrop';
import { useTheme } from '../../src/theme/useTheme';
import { radius, space, motion } from '../../src/theme/tokens';
import { useT } from '../../src/i18n';
import { usePlanStore, remainingFor } from '../../src/store/usePlanStore';
import {
  formatTimer, formatDuration, formatDurationShort, clockFromNow, formatClock, minutesNow,
} from '../../src/lib/time';
import { haptic } from '../../src/lib/haptics';
import type { Task } from '../../src/store/types';

const MAX_MIN = 60;

/**
 * The dial is the one thing on this screen with a fixed aspect ratio and no way
 * to reflow, and the tray took real height from the stage it stands in. At 266
 * it no longer fits between the title and a tray carrying an activity badge on
 * a short phone (SE, mini) — and a circular control clipped by a panel is worse
 * than a slightly smaller one, so it steps down instead.
 *
 * The stroke is derived rather than fixed, because a 24pt band on a 214pt dial
 * is a visibly different object: the ring would read as heavier at the size
 * where the screen already has less room.
 */
function useDial() {
  const { height } = useWindowDimensions();
  const size = height < 760 ? 214 : 266;
  return { size, stroke: Math.round(size / 11) };
}

/** The four lengths people actually pick. The dial stays for everything else. */
const PRESETS = [15, 25, 45, 60];

/**
 * ── THE SCREEN IS A STAGE AND A TRAY ───────────────────────────────────────
 *
 * Everything here used to be one centred column floating on the canvas: dial,
 * chips, caption, activity pill, button — and once a session was running,
 * three loose buttons in a row. Nothing was anchored to anything, so the eye
 * had no order to read them in, the controls drifted vertically as the content
 * above them changed size, and the primary action sat in the middle of the
 * screen, which on a phone is the one place a thumb does not rest.
 *
 * Life Reset's pomodoro screen answers this by splitting the screen in two,
 * and that split is what this file now follows:
 *
 *   ┌──────────────────────────┐
 *   │  STAGE                   │  calm, ambient, one thing to look at:
 *   │       ( the time )       │  the aura, the ring, the number
 *   │                          │
 *   ├──────────────────────────┤  ← the tray's top edge is the only hard
 *   │  TRAY                    │    line on the screen, and it grounds every
 *   │  ─────── rail ───────    │    control at thumb height
 *   │  [+1 min] (▮▮) [end]     │
 *   └──────────────────────────┘
 *
 * The stage is the part you are meant to stop looking at. The tray is the part
 * you reach for without looking. Keeping them apart is the whole idea — most
 * of the individual controls are unchanged.
 */

export default function Focus() {
  const insets = useSafeAreaInsets();
  const { c } = useTheme();
  const { t } = useT();
  const params = useLocalSearchParams<{ taskId?: string }>();

  const focus = usePlanStore((s) => s.focus);
  const tasks = usePlanStore((s) => s.tasks);

  /**
   * ── THE INCOMING REQUEST, WHICH USED TO OUTLIVE ITSELF ────────────────────
   * `taskId` arrives when someone taps "focus on this" from a row or a detail
   * screen. It is a one-shot instruction, but it is a TAB route's param, and a
   * tab route is never popped — so it stayed set for the rest of the session.
   * Finish a session on Lunch, come back to Focus tomorrow, and the picker was
   * still pinned to Lunch, still tinted for it, and Start would have attached a
   * fresh session to an activity that was ticked off yesterday.
   *
   * Clearing it on blur is what makes it one-shot: by the time the screen is
   * left, the request has either been started (and `focus.taskId` owns it from
   * then on) or abandoned.
   */
  const paramTaskId = params.taskId || undefined;
  /**
   * The cleanup reads a REF and the callback has no dependencies, so it fires
   * on blur and on nothing else. Closing over `paramTaskId` directly would make
   * the callback's identity change whenever the param does, and `useFocusEffect`
   * runs the previous cleanup on an identity change as well as on a blur — so
   * a screen that was already focused when a new taskId arrived would clear the
   * param it had just been handed.
   */
  const paramRef = useRef(paramTaskId);
  paramRef.current = paramTaskId;
  useFocusEffect(
    useCallback(() => () => {
      if (paramRef.current) router.setParams({ taskId: '' });
    }, [])
  );

  const paramTask = useMemo(
    () => tasks.find((t) => t.id === paramTaskId) ?? null,
    [tasks, paramTaskId]
  );
  const activeTask = useMemo(
    () => tasks.find((t) => t.id === focus?.taskId) ?? null,
    [tasks, focus?.taskId]
  );

  /**
   * The activity whose colour fills the room.
   *
   * It follows the session once one is running, and the incoming route param
   * before that — so tapping "focus on Lunch" from a task row tints the picker
   * itself, and the screen is already the right colour before Start is pressed.
   */
  const auraTint = (focus ? activeTask : paramTask)?.tint ?? null;

  return (
    <View style={{ flex: 1, backgroundColor: c.canvasTinted }}>
      {/* ── THE GROUND, IN TWO LAYERS ──────────────────────────────────────
          The forest is the STILL layer and the aura is the MOVING one, and
          they are in this order on purpose: the activity's colour has to wash
          OVER the foliage, not under it, or starting a session on "Lunch"
          stops turning the room the colour of Lunch — which is the one thing
          on this screen that ties the ambience back to the user's own data.

          Both sit outside the two branches below, so switching between the
          picker and a running session does not remount them and restart the
          drift from zero. */}
      <BotanicalBackdrop />
      <FocusAura tint={auraTint} intensity={focus ? 1 : 0.72} />

      {/* The title sits OUTSIDE both branches and above the stage. It is the one
          thing that is true in every state, and a title that scrolled away
          under a running session would take the app's only "where am I" cue
          with it. */}
      <View
        style={{
          alignItems: 'center',
          paddingTop: insets.top + space.sm,
          paddingBottom: space.sm,
        }}
      >
        <Txt variant="displayLg">{t('focus.title')}</Txt>
      </View>

      {focus ? (
        <Running task={activeTask} />
      ) : (
        /*
          KEYED ON THE ACTIVITY.

          `DialPicker` seeds the dial from `task.minutes` in a
          `useSharedValue`/`useState` initialiser, which only runs on mount —
          and a tab screen never unmounts (`detachInactiveScreens` is off for
          the fade transition). So opening Focus from a 10-minute activity and
          then from a 45-minute one left the dial reading 10 while the chip
          underneath it named the 45-minute activity: two parts of one screen
          disagreeing about what was about to start. Keying on the id remounts
          the picker, which is what re-runs those initialisers.
        */
        <DialPicker key={paramTask?.id ?? 'none'} task={paramTask} />
      )}
    </View>
  );
}

/* ------------------------------------------------------------------ tray -- */

/**
 * The grounded panel every control lives in.
 *
 * Its surface runs all the way to the bottom of the screen and the floating gel
 * tab bar sits ON it — so the padding below the content is that bar's own
 * height plus the home indicator, not a guess. Shrink it and the last row of
 * controls ends up underneath the tab bar, which is the bug a bottom-anchored
 * panel invites.
 *
 * The shadow is written out rather than taken from `shadow[n]` because every
 * elevation token offsets DOWNWARD: on a panel welded to the bottom edge all of
 * that falls off the screen and the tray reads as a flat colour change. The only
 * edge this surface has is its top one, so that is the edge that casts.
 */
function Tray({ children }: { children: ReactNode }) {
  const { c, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{
        paddingHorizontal: space.lg,
        paddingTop: space.lg,
        paddingBottom: TAB_BAR_HEIGHT + Math.max(insets.bottom, space.md) + space.sm,
        gap: space.base,
        borderTopLeftRadius: radius.sheet,
        borderTopRightRadius: radius.sheet,
        borderCurve: 'continuous',
        backgroundColor: c.surface,
        boxShadow: isDark
          ? '0px -10px 30px rgba(0,0,0,0.55)'
          : '0px -10px 30px rgba(23,19,15,0.10)',
      }}
    >
      {children}
    </View>
  );
}

/** The tray's one primary action: full width, because there is only ever one. */
function TrayButton({
  label, icon, onPress, accessibilityLabel,
}: {
  label: string;
  icon?: 'play.fill' | 'checkmark';
  onPress: () => void;
  accessibilityLabel?: string;
}) {
  const { c } = useTheme();
  return (
    <PressScale
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      style={{
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm,
        height: 54, borderRadius: radius.pill, backgroundColor: c.solid,
      }}
    >
      {icon === 'checkmark' ? <Icon name="checkmark" size={15} color={c.onSolid} weight="bold" /> : null}
      <Txt variant="title" color={c.onSolid}>{label}</Txt>
      {icon === 'play.fill' ? <Icon name="play.fill" size={14} color={c.onSolid} weight="bold" /> : null}
    </PressScale>
  );
}

/** The quiet alternative under it. Never a filled pill — there is one primary. */
function TrayTextButton({ label, onPress }: { label: string; onPress: () => void }) {
  const { c } = useTheme();
  return (
    <PressScale
      onPress={onPress}
      scaleTo={0.98}
      accessibilityRole="button"
      style={{ height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: radius.pill }}
    >
      <Txt variant="title" color={c.inkMuted}>{label}</Txt>
    </PressScale>
  );
}

/**
 * The activity a session is about to attach to.
 *
 * In the tray rather than floating above the button, because it is a statement
 * about what Start will do — and the place for that is directly above Start.
 */
function TaskBadge({ task }: { task: Task }) {
  const { c } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row', alignItems: 'center', gap: space.sm,
        paddingVertical: space.sm, paddingHorizontal: space.md,
        borderRadius: radius.pill, backgroundColor: c.surfaceSunken,
      }}
    >
      <EmojiAvatar emoji={task.emoji} tint={task.tint} size={24} />
      <Txt variant="captionStrong" numberOfLines={1} style={{ flex: 1 }}>{task.title}</Txt>
    </View>
  );
}

/* ---------------------------------------------------------------- picker -- */

function DialPicker({ task }: { task: Task | null }) {
  const { c, shadow, isDark } = useTheme();
  const { t } = useT();
  const { size: DIAL, stroke: STROKE } = useDial();
  const startFocus = usePlanStore((s) => s.startFocus);
  const initial = task ? Math.min(MAX_MIN, task.minutes) : 15;
  const minutes = useSharedValue(initial);
  const [display, setDisplay] = useState(initial);

  const progress = useDerivedValue(() => minutes.get() / MAX_MIN);

  /**
   * True only while a finger is on the dial.
   *
   * The detent below fires on any change to `minutes`, including the spring a
   * preset tap starts — and jumping 15 → 60 crosses nine detents, so one tap
   * would buzz nine times. Haptics are punctuation: one per user action. The
   * preset plays its own single tap instead.
   */
  const dragging = useSharedValue(false);

  // A detent every 5 minutes: bounded haptic frequency, and it feels like the
  // dial has teeth rather than buzzing continuously.
  useAnimatedReaction(
    () => Math.round(minutes.get() / 5),
    (cur, prev) => {
      if (prev !== null && cur !== prev && dragging.get()) scheduleOnRN(haptic.tick);
    }
  );

  useAnimatedReaction(
    () => Math.max(1, Math.round(minutes.get())),
    (cur, prev) => { if (cur !== prev) scheduleOnRN(setDisplay, cur); }
  );

  const pan = Gesture.Pan()
    .onBegin((e) => {
      'worklet';
      dragging.set(true);
      applyAngle(e.x, e.y, minutes, DIAL, true);
    })
    .onUpdate((e) => {
      'worklet';
      applyAngle(e.x, e.y, minutes, DIAL);
    })
    .onFinalize(() => {
      'worklet';
      // The gesture ends by snapping home: a whole-minute target settled with
      // the app's spring vocabulary, so releasing feels like a detent rather
      // than an abrupt stop wherever the finger happened to lift.
      // Cleared BEFORE the snap so the settling spring cannot fire a detent on
      // top of the release tap below.
      dragging.set(false);
      const snapped = Math.max(1, Math.round(minutes.get()));
      minutes.set(withSpring(snapped, motion.settle));
      scheduleOnRN(haptic.tap);
    });

  const knob = useAnimatedStyle(() => {
    const r = (DIAL - STROKE) / 2;
    const a = (minutes.get() / MAX_MIN) * Math.PI * 2 - Math.PI / 2;
    return {
      transform: [
        { translateX: Math.cos(a) * r },
        { translateY: Math.sin(a) * r },
      ],
    };
  });

  /** Presets drive the SAME shared value, so the dial travels to the number. */
  const pick = (m: number) => {
    haptic.tap();
    minutes.set(withSpring(m, motion.settle));
  };

  return (
    <>
      {/*
        THE STAGE DOES NOT SCROLL, and that is a constraint rather than an
        oversight: the dial is a circular drag, so every stroke has a vertical
        component — inside a ScrollView the scroll gesture wins the race and the
        dial stops responding altogether.
      */}
      <View
        style={{
          flex: 1, alignItems: 'center', justifyContent: 'center',
          gap: space.lg, paddingHorizontal: space.lg,
        }}
      >
        <GestureDetector gesture={pan}>
          <View
            style={{ width: DIAL, height: DIAL, alignItems: 'center', justifyContent: 'center' }}
            accessibilityRole="adjustable"
            accessibilityLabel={t('focus.dialLabel')}
            accessibilityValue={{ text: formatDuration(display) }}
          >
            <Ring
              size={DIAL} strokeWidth={STROKE} progress={progress}
              color={c.accent} track={c.accentSoft} tickColor={c.canvasTinted}
            />

            <View style={{ position: 'absolute', alignItems: 'center', gap: -4 }}>
              <Txt variant="numeral" tabular>{display}</Txt>
              <Txt variant="micro" tone="muted">{t('focus.minutes', { count: display })}</Txt>
            </View>

            <Animated.View
              pointerEvents="none"
              style={[
                {
                  position: 'absolute',
                  width: STROKE - 8, height: STROKE - 8, borderRadius: STROKE,
                  // The knob is a physical handle, so it stays light against the
                  // accent ring in BOTH themes — `surface` would render it
                  // near-black in dark and read as a gap in the ring.
                  backgroundColor: isDark ? c.ink : c.surface,
                  boxShadow: shadow[2],
                },
                knob,
              ]}
            />
          </View>
        </GestureDetector>

        {/* The one fact the dial cannot state: what time you get your evening
            back. It stays on the stage, with the dial it describes. */}
        <Txt variant="caption" tone="faint" tabular>
          {t('focus.endsAt', { time: clockFromNow(display) })}
        </Txt>
      </View>

      <Tray>
        <View style={{ gap: 2 }}>
          <Txt variant="title">{t('focus.setLength')}</Txt>
          <Txt variant="caption" tone="muted">{t('focus.pickLength')}</Txt>
        </View>

        {/* Four across, each on `flex: 1`. Equal widths turn four separate pills
            into one segmented row, which is what makes them read as the
            shortcuts they are rather than as four more things to weigh up. */}
        <View style={{ flexDirection: 'row', gap: space.sm }}>
          {PRESETS.map((m) => (
            <PresetChip key={m} minutes={m} active={display === m} onPress={() => pick(m)} />
          ))}
        </View>

        {task ? <TaskBadge task={task} /> : null}

        <TrayButton
          label={t('focus.start')}
          icon="play.fill"
          accessibilityLabel={t('focus.startA11y', { duration: formatDuration(display) })}
          onPress={() => { haptic.bump(); startFocus(display * 60, task?.id ?? null); }}
        />
      </Tray>
    </>
  );
}

/**
 * THE `flex: 1` GOES ON A WRAPPER, NOT ON `PressScale`.
 *
 * `PressScale` applies the style it is given to an `Animated.View` INSIDE the
 * Pressable, so that the scale transform does not move the touch target out
 * from under the finger. Paint works as expected there; anything that asks the
 * PARENT for space does not. `flex: 1` on that inner view stretches it inside a
 * Pressable already sized to its own content, and the chip collapses to a
 * hairline — which is exactly what these four did on first run.
 */
function PresetChip({ minutes, active, onPress }: { minutes: number; active: boolean; onPress: () => void }) {
  const { c } = useTheme();
  return (
    <View style={{ flex: 1 }}>
      <PressScale
        onPress={onPress}
        scaleTo={0.94}
        accessibilityRole="button"
        accessibilityState={{ selected: active }}
        accessibilityLabel={formatDuration(minutes)}
        style={{
          height: 42, alignItems: 'center', justifyContent: 'center',
          borderRadius: radius.pill,
          backgroundColor: active ? c.accentSoft : c.surfaceSunken,
          borderWidth: 1.5,
          borderColor: active ? c.accent : 'transparent',
        }}
      >
        <Txt variant="captionStrong" color={active ? c.accentInk : c.inkMuted} tabular>
          {formatDurationShort(minutes)}
        </Txt>
      </PressScale>
    </View>
  );
}

/**
 * Touch point -> dial minutes. Runs on the UI thread; never touches JS.
 *
 * ── `jump` IS WHY THE DIAL USED TO IGNORE HALF OF ITSELF ───────────────────
 * The wrap guard below rejects a change of more than half the dial, so that
 * dragging past twelve o'clock does not snap from 59 to 1 under the finger.
 * That is right DURING a drag and wrong at the start of one: it ran on
 * `onBegin` too, so putting a finger down more than thirty minutes away from
 * the current value was rejected — and because the value then never moved,
 * every subsequent `onUpdate` was measured against the same unchanged number
 * and rejected as well. The entire gesture was dead. With the dial on 15,
 * touching anywhere from roughly 45 to 60 did nothing at all, which reads as
 * the control being broken rather than as a guard doing its job.
 *
 * A touch-down is an absolute placement — there is no previous position within
 * the gesture to wrap around yet — so it sets the value outright and only the
 * updates that follow are guarded.
 */
function applyAngle(
  x: number, y: number, minutes: SharedValue<number>, size: number, jump = false,
) {
  'worklet';
  const cx = size / 2;
  const cy = size / 2;
  let deg = (Math.atan2(y - cy, x - cx) * 180) / Math.PI + 90;
  if (deg < 0) deg += 360;
  const next = (deg / 360) * MAX_MIN;
  if (!jump && Math.abs(next - minutes.get()) > MAX_MIN / 2) return;
  minutes.set(Math.max(1, next));
}

/* --------------------------------------------------------------- running -- */

function Running({ task }: { task: Task | null }) {
  const { c, shadow } = useTheme();
  const { t } = useT();
  const { size: DIAL, stroke: STROKE } = useDial();
  const reduced = useReducedMotion();
  const focus = usePlanStore((s) => s.focus)!;
  const pause = usePlanStore((s) => s.pauseFocus);
  const resume = usePlanStore((s) => s.resumeFocus);
  const extend = usePlanStore((s) => s.extendFocus);
  const end = usePlanStore((s) => s.endFocus);
  const toggleStep = usePlanStore((s) => s.toggleStep);
  const toggleTask = usePlanStore((s) => s.toggleTask);

  const [left, setLeft] = useState(() => remainingFor(focus));
  const progress = useSharedValue(focus.totalSeconds ? remainingFor(focus) / focus.totalSeconds : 0);
  const finished = useRef(false);

  const running = focus.startedAt != null;

  // The ring sweeps on the UI thread with ONE long timing animation. The text
  // is the only thing that re-renders, once per second.
  useEffect(() => {
    cancelAnimation(progress);
    const rem = remainingFor(focus);
    const frac = focus.totalSeconds ? rem / focus.totalSeconds : 0;
    progress.set(frac);
    if (running && rem > 0) {
      progress.set(withTiming(0, { duration: rem * 1000, easing: Easing.linear }));
    }
  }, [running, focus.totalSeconds, focus.startedAt, focus.remainingSeconds, progress, focus]);

  useEffect(() => {
    setLeft(remainingFor(focus));
    if (!running) return;
    const id = setInterval(() => {
      // Read the session fresh: if it was ended manually this tick, there is
      // nothing left to count and no completion to celebrate.
      const live = usePlanStore.getState().focus;
      if (!live) { clearInterval(id); return; }
      const r = remainingFor(live);
      setLeft(r);
      if (r <= 0) {
        // Stop ticking at zero instead of re-rendering forever behind the
        // "time is up" state.
        clearInterval(id);
        if (!finished.current) {
          finished.current = true;
          haptic.success();
        }
      }
    }, 250);
    return () => clearInterval(id);
  }, [running, focus]);

  const done = left <= 0;

  /**
   * The session's start and end as wall-clock times — the rail's two ends.
   *
   * "44:48 remaining" answers a different question from "you are free at 3:42".
   * The second one is what people actually plan around, and it is the reason
   * this exists at all next to a countdown.
   */
  const range = useMemo(() => {
    const rem = remainingFor(focus);
    // Elapsed must include the CURRENT run segment, not just the time banked
    // before it — `remainingSeconds` is only refreshed on pause, so using it
    // alone would make the start time creep forward as the session ran.
    //
    // Both ends are stable without a ticker: `now` and `rem` move at the same
    // rate, so `now + rem` and `now - elapsed` are constants. That is why this
    // memo can depend on the session alone and still stay correct each second.
    const elapsedMin = (focus.totalSeconds - rem) / 60;
    const startedMin = focus.startedAt != null ? minutesNow() - elapsedMin : null;
    return {
      from: startedMin != null
        // A session begun before midnight yields a negative value; wrap it
        // rather than clamping, which would print "12:00 AM".
        ? formatClock(((Math.round(startedMin) % 1440) + 1440) % 1440)
        : null,
      to: clockFromNow(rem / 60),
    };
  }, [focus]);

  /**
   * Ending early is not undoable — the elapsed time is gone from the session —
   * so it asks. Time running OUT does not ask, because that outcome is the one
   * the user set up.
   */
  const confirmEnd = useCallback(() => {
    haptic.warn();
    const go = () => end();
    if (process.env.EXPO_OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: [t('focus.endSession'), t('focus.keepGoing')],
          destructiveButtonIndex: 0,
          cancelButtonIndex: 1,
          title: t('focus.endTitle'),
          message: t('focus.endMessage', { time: formatTimer(left) }),
        },
        (i) => { if (i === 0) go(); }
      );
    } else {
      Alert.alert(t('focus.endTitle'), t('focus.endMessage', { time: formatTimer(left) }), [
        { text: t('focus.keepGoing'), style: 'cancel' },
        { text: t('focus.endSession'), style: 'destructive', onPress: go },
      ]);
    }
  }, [end, left, t]);

  const steps = task?.steps ?? [];
  const stepsDone = steps.filter((s) => s.done).length;
  const allStepsDone = steps.length > 0 && stepsDone === steps.length;

  return (
    <>
      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          flexGrow: 1, alignItems: 'center', justifyContent: 'center',
          paddingHorizontal: space.lg, paddingBottom: space.lg, gap: space.lg,
        }}
      >
        {done ? (
          /*
            AT ZERO THE RING IS REPLACED, NOT DECORATED.

            A ring exists to show how much is left; at zero it shows nothing and
            still occupies the best part of the screen. Handing the stage over
            to the celebration is also what keeps this state off the scrollbar
            on a small phone — ring, confetti, mascot and message together did
            not fit above the tray.
          */
          <Animated.View
            entering={reduced ? undefined : FadeInDown.duration(360).springify().damping(18)}
            style={{ alignItems: 'center', gap: space.base, alignSelf: 'stretch' }}
          >
            {/* The app's one confetti burst, and the only place Pupu appears on
                this screen. He is absent for the whole session on purpose: this
                is the screen you are meant to stop looking at, and its single
                ambient animation is the halo. He arrives when the timer stops,
                which is the moment there is finally something to celebrate —
                and it is a session the user actually finished, not a setup
                step. */}
            <View style={{ alignSelf: 'stretch', alignItems: 'center' }}>
              <Confetti height={250} />
              <PupuScene pose="cheer" size={148} idle="bob" delay={80} />
            </View>

            <Txt variant="displaySm" style={{ textAlign: 'center' }}>
              {t(allStepsDone ? 'focus.allDone' : 'focus.timeUp')}
            </Txt>

            {task ? (
              <Txt variant="caption" tone="muted" numberOfLines={1} style={{ maxWidth: 300 }}>
                {task.title}
              </Txt>
            ) : null}
          </Animated.View>
        ) : (
          <>
            <View style={{ width: DIAL, height: DIAL, alignItems: 'center', justifyContent: 'center' }}>
              {/* Sits behind the ring and only breathes while the clock is
                  actually moving — a halo under a paused timer would claim
                  progress that is not happening. */}
              <Halo size={DIAL + 120} ringSize={DIAL} color={c.accent} active={running} />

              <Ring
                size={DIAL} strokeWidth={STROKE} progress={progress}
                color={c.accent} track={c.accentSoft} tickColor={c.canvasTinted}
              />

              <View style={{ position: 'absolute', alignItems: 'center', gap: space.md }}>
                {task ? <EmojiAvatar emoji={task.emoji} tint={task.tint} size={88} /> : null}
                {!task ? (
                  <Txt variant="numeral" tabular style={{ fontSize: 56, lineHeight: 62 }}>
                    {formatTimer(left)}
                  </Txt>
                ) : null}
              </View>
            </View>

            {/* With a task in the ring the numerals move BELOW it, where they get
                their full display size back instead of being squeezed around art. */}
            {task ? (
              <View style={{ alignItems: 'center', gap: 2 }}>
                <Txt variant="numeral" tabular style={{ fontSize: 52, lineHeight: 58 }}>
                  {formatTimer(left)}
                </Txt>
                <Txt variant="title" numberOfLines={1} style={{ maxWidth: 300, textAlign: 'center' }}>
                  {task.title}
                </Txt>
              </View>
            ) : null}
          </>
        )}

        {/* The routine's own steps, on the screen you are already staring at.
            Without these, focusing on a four-step routine means leaving the timer
            to tick each one off somewhere else. */}
        {steps.length > 0 ? (
          <View style={{ alignSelf: 'stretch', gap: space.sm }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Txt variant="micro" tone="faint">{t('focus.steps')}</Txt>
              <Txt variant="micro" tone="faint" tabular>{stepsDone}/{steps.length}</Txt>
            </View>
            <View
              style={{
                borderRadius: radius.card, borderCurve: 'continuous',
                backgroundColor: c.surface, boxShadow: shadow[1], overflow: 'hidden',
              }}
            >
              {steps.map((s, i) => (
                <Pressable
                  key={s.id}
                  onPress={() => { haptic.tick(); toggleStep(task!.id, s.id); }}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: s.done }}
                  accessibilityLabel={s.title}
                  style={{
                    flexDirection: 'row', alignItems: 'center', gap: space.md,
                    paddingHorizontal: space.base, paddingVertical: 14,
                    borderTopWidth: i === 0 ? 0 : 1, borderTopColor: c.hairline,
                  }}
                >
                  <Checkbox
                    checked={s.done}
                    identity={s.id}
                    label={s.title}
                    onToggle={() => { haptic.tick(); toggleStep(task!.id, s.id); }}
                    size={22}
                    subtle
                  />
                  <Strike struck={s.done} identity={s.id} variant="body" tone="ink" numberOfLines={2}>
                    {s.title}
                  </Strike>
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}
      </ScrollView>

      <Tray>
        {done ? (
          task && !task.done ? (
            <>
              <TrayButton
                label={t('focus.markItDone')}
                icon="checkmark"
                onPress={() => { haptic.success(); toggleTask(task.id); end(); }}
              />
              <TrayTextButton label={t('focus.notYet')} onPress={() => { haptic.tap(); end(); }} />
            </>
          ) : (
            <TrayButton label={t('common.done')} onPress={() => { haptic.tap(); end(); }} />
          )
        ) : (
          <>
            <SessionRail progress={progress} from={range.from} to={range.to} paused={!running} />

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
              <RailChip
                label={t('focus.addMinute')}
                accessibilityLabel={t('focus.addMinuteA11y')}
                onPress={() => { haptic.tick(); extend(60); }}
              />

              <PressScale
                onPress={() => { haptic.bump(); running ? pause() : resume(); }}
                accessibilityRole="button"
                accessibilityLabel={t(running ? 'focus.pause' : 'focus.resume')}
                style={{
                  width: 62, height: 62, borderRadius: 31,
                  alignItems: 'center', justifyContent: 'center',
                  backgroundColor: c.solid, boxShadow: shadow[2],
                }}
              >
                <Icon name={running ? 'pause.fill' : 'play.fill'} size={20} color={c.onSolid} weight="bold" />
              </PressScale>

              <RailChip
                label={t('focus.end')}
                accessibilityLabel={t('focus.endSession')}
                onPress={confirmEnd}
              />
            </View>
          </>
        )}
      </Tray>
    </>
  );
}

/**
 * THE RAIL — the session laid out along the clock.
 *
 * Deliberately 4pt and unlabelled, because the ring above it is already the
 * progress indicator and two heroes for one number is one too many. The rail is
 * here for the thing the ring genuinely cannot say: WHEN. Its ends are
 * wall-clock times, so the fill answers "where am I between starting and being
 * free" rather than repeating "how much is left".
 *
 * That is also why it FILLS as time is spent while the ring EMPTIES. They are
 * not one statement drawn twice: one is a countdown, the other is a position on
 * a timeline — and a timeline that ran backwards under labels reading left to
 * right would be the confusing half of both.
 */
function SessionRail({
  progress, from, to, paused,
}: { progress: SharedValue<number>; from: string | null; to: string; paused: boolean }) {
  const { c } = useTheme();
  const { t } = useT();

  const fill = useAnimatedStyle(() => ({
    width: `${(1 - Math.max(0, Math.min(1, progress.get()))) * 100}%`,
  }));

  return (
    <View style={{ gap: space.sm }}>
      <View
        style={{
          height: 4, borderRadius: radius.bar, overflow: 'hidden',
          backgroundColor: c.surfaceSunken,
        }}
      >
        <Animated.View
          style={[
            { height: '100%', borderRadius: radius.bar, backgroundColor: paused ? c.inkFaint : c.accent },
            fill,
          ]}
        />
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        {/*
          A PAUSED SESSION HAS NEITHER END, so it is given neither.

          Pausing clears `startedAt` — which is exactly what stops the remaining
          time decaying — so there is no start time to report. The end time is
          worse than absent: it is computed from the moment the pause began and
          nothing re-computes it while nothing is running, so a session paused
          for ten minutes would sit there promising a finish it can no longer
          make. The rail says the one thing that is still true instead.
        */}
        {paused ? (
          <Txt variant="micro" tone="faint">{t('focus.paused')}</Txt>
        ) : (
          <>
            <Txt variant="micro" tone="faint" tabular>{from ?? ''}</Txt>
            <Txt variant="micro" tone="faint" tabular>{to}</Txt>
          </>
        )}
      </View>
    </View>
  );
}

/**
 * The two secondary actions that flank the pause button, on equal widths.
 *
 * Wrapped for the same reason as `PresetChip`: `flex: 1` handed to `PressScale`
 * lands on a view the Pressable has already sized, and collapses it.
 */
function RailChip({
  label, accessibilityLabel, onPress,
}: { label: string; accessibilityLabel: string; onPress: () => void }) {
  const { c } = useTheme();
  return (
    <View style={{ flex: 1 }}>
      <PressScale
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        style={{
          height: 46, alignItems: 'center', justifyContent: 'center',
          borderRadius: radius.pill, backgroundColor: c.surfaceSunken,
        }}
      >
        <Txt variant="captionStrong" color={c.inkMuted}>{label}</Txt>
      </PressScale>
    </View>
  );
}
