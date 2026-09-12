import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, ScrollView, Pressable, ActionSheetIOS, Alert } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue, useAnimatedStyle, useDerivedValue, useAnimatedReaction,
  withTiming, withSpring, cancelAnimation, Easing, FadeIn, FadeInDown,
  useReducedMotion, type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { Txt } from '../../src/components/Txt';
import { Icon } from '../../src/components/Icon';
import { Ring } from '../../src/components/Ring';
import { Halo } from '../../src/components/Halo';
import { Checkbox } from '../../src/components/Checkbox';
import { EmojiAvatar } from '../../src/components/EmojiAvatar';
import { PressScale } from '../../src/components/Press';
import { PipScene, Confetti } from '../../src/components/mascot/PipScene';
import { TAB_BAR_HEIGHT } from '../../src/components/TabBar';
import { useTheme } from '../../src/theme/useTheme';
import { radius, space, motion } from '../../src/theme/tokens';
import { usePlanStore, remainingFor } from '../../src/store/usePlanStore';
import { formatTimer, formatDuration, clockFromNow, formatClock, minutesNow } from '../../src/lib/time';
import { haptic } from '../../src/lib/haptics';
import type { Task } from '../../src/store/types';

const DIAL = 266;
const STROKE = 24;
const MAX_MIN = 60;

/** The four lengths people actually pick. The dial stays for everything else. */
const PRESETS = [15, 25, 45, 60];

export default function Focus() {
  const insets = useSafeAreaInsets();
  const { c } = useTheme();
  const params = useLocalSearchParams<{ taskId?: string }>();

  const focus = usePlanStore((s) => s.focus);
  const tasks = usePlanStore((s) => s.tasks);

  const paramTask = useMemo(
    () => tasks.find((t) => t.id === params.taskId) ?? null,
    [tasks, params.taskId]
  );
  const activeTask = useMemo(
    () => tasks.find((t) => t.id === focus?.taskId) ?? null,
    [tasks, focus?.taskId]
  );

  /**
   * The session's start and end as wall-clock times.
   *
   * "44:48 remaining" answers a different question from "you are free at 3:42".
   * The second one is the one people actually plan around, and it is the reason
   * this line exists rather than just a countdown.
   */
  const range = useMemo(() => {
    if (!focus) return null;
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

  const pad = {
    flexGrow: 1,
    paddingTop: insets.top + space.sm,
    paddingHorizontal: space.lg,
    paddingBottom: TAB_BAR_HEIGHT + insets.bottom + space.xl,
  } as const;

  const header = (
    <View style={{ alignItems: 'center', gap: space.xs, paddingBottom: space.base }}>
      <Txt variant="displayLg">Focus</Txt>
      {focus && range ? (
        <Txt variant="caption" tone="muted" tabular>
          {range.from ? `${range.from} → ${range.to}` : `Ends at ${range.to}`}
        </Txt>
      ) : (
        <Txt variant="caption" tone="muted">Pick how long you want to disappear for</Txt>
      )}
    </View>
  );

  /**
   * Only the RUNNING state scrolls.
   *
   * The dial is a circular drag, so it has a vertical component on every
   * stroke — inside a ScrollView the scroll gesture wins and the dial stops
   * responding. The picker fits on a screen without scrolling, while the
   * running state has to accommodate a routine's step list, so the container
   * differs by state rather than compromising both.
   */
  return (
    <View style={{ flex: 1, backgroundColor: c.canvasTinted }}>
      {focus ? (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={pad}>
          {header}
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <Running task={activeTask} />
          </View>
        </ScrollView>
      ) : (
        <View style={pad}>
          {header}
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <DialPicker task={paramTask} />
          </View>
        </View>
      )}
    </View>
  );
}

/* ---------------------------------------------------------------- picker -- */

function DialPicker({ task }: { task: Task | null }) {
  const { c, shadow, isDark } = useTheme();
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
      applyAngle(e.x, e.y, minutes);
    })
    .onUpdate((e) => {
      'worklet';
      applyAngle(e.x, e.y, minutes);
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
    <View style={{ alignItems: 'center', gap: space.xl }}>
      <GestureDetector gesture={pan}>
        <View
          style={{ width: DIAL, height: DIAL, alignItems: 'center', justifyContent: 'center' }}
          accessibilityRole="adjustable"
          accessibilityLabel="Focus length"
          accessibilityValue={{ text: formatDuration(display) }}
        >
          <Ring
            size={DIAL} strokeWidth={STROKE} progress={progress}
            color={c.accent} track={c.accentSoft} tickColor={c.canvasTinted}
          />

          <View style={{ position: 'absolute', alignItems: 'center', gap: -4 }}>
            <Txt variant="numeral" tabular>{display}</Txt>
            <Txt variant="micro" tone="muted">{display === 1 ? 'MINUTE' : 'MINUTES'}</Txt>
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

      <View style={{ alignItems: 'center', gap: space.md }}>
        <View style={{ flexDirection: 'row', gap: space.sm }}>
          {PRESETS.map((m) => (
            <PresetChip key={m} minutes={m} active={display === m} onPress={() => pick(m)} />
          ))}
        </View>
        <Txt variant="caption" tone="faint" tabular>Ends at {clockFromNow(display)}</Txt>
      </View>

      {task ? (
        <View
          style={{
            flexDirection: 'row', alignItems: 'center', gap: space.sm,
            paddingVertical: 6, paddingHorizontal: space.md, paddingRight: space.base,
            borderRadius: radius.pill, backgroundColor: c.surface, boxShadow: shadow[1],
          }}
        >
          <EmojiAvatar emoji={task.emoji} tint={task.tint} size={24} />
          <Txt variant="captionStrong" numberOfLines={1}>{task.title}</Txt>
        </View>
      ) : null}

      <PressScale
        onPress={() => { haptic.bump(); startFocus(display * 60, task?.id ?? null); }}
        accessibilityRole="button"
        accessibilityLabel={`Start ${formatDuration(display)} focus`}
        style={{
          flexDirection: 'row', alignItems: 'center', gap: space.sm,
          height: 54, paddingHorizontal: space.xxl,
          borderRadius: radius.pill, backgroundColor: c.solid,
        }}
      >
        <Txt variant="title" color={c.onSolid}>Start</Txt>
        <Icon name="play.fill" size={14} color={c.onSolid} weight="bold" />
      </PressScale>
    </View>
  );
}

function PresetChip({ minutes, active, onPress }: { minutes: number; active: boolean; onPress: () => void }) {
  const { c } = useTheme();
  return (
    <PressScale
      onPress={onPress}
      scaleTo={0.94}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={formatDuration(minutes)}
      style={{
        minWidth: 56, height: 38, alignItems: 'center', justifyContent: 'center',
        paddingHorizontal: space.md,
        borderRadius: radius.pill,
        backgroundColor: active ? c.accentSoft : c.surface,
        borderWidth: 1.5,
        borderColor: active ? c.accent : 'transparent',
      }}
    >
      <Txt variant="captionStrong" color={active ? c.accentInk : c.inkMuted} tabular>
        {minutes}m
      </Txt>
    </PressScale>
  );
}

/** Touch point -> dial minutes. Runs on the UI thread; never touches JS. */
function applyAngle(x: number, y: number, minutes: SharedValue<number>) {
  'worklet';
  const cx = DIAL / 2;
  const cy = DIAL / 2;
  let deg = (Math.atan2(y - cy, x - cx) * 180) / Math.PI + 90;
  if (deg < 0) deg += 360;
  const next = (deg / 360) * MAX_MIN;
  // Reject the wrap-around jump so dragging past the top does not snap the
  // dial from 59 to 1 under the finger.
  if (Math.abs(next - minutes.get()) > MAX_MIN / 2) return;
  minutes.set(Math.max(1, next));
}

/* --------------------------------------------------------------- running -- */

function Running({ task }: { task: Task | null }) {
  const { c, shadow } = useTheme();
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
          options: ['End session', 'Keep going'],
          destructiveButtonIndex: 0,
          cancelButtonIndex: 1,
          title: 'End this focus session?',
          message: `${formatTimer(left)} left.`,
        },
        (i) => { if (i === 0) go(); }
      );
    } else {
      Alert.alert('End this focus session?', `${formatTimer(left)} left.`, [
        { text: 'Keep going', style: 'cancel' },
        { text: 'End session', style: 'destructive', onPress: go },
      ]);
    }
  }, [end, left]);

  const steps = task?.steps ?? [];
  const stepsDone = steps.filter((s) => s.done).length;
  const allStepsDone = steps.length > 0 && stepsDone === steps.length;

  return (
    <View style={{ alignItems: 'center', gap: space.xl, alignSelf: 'stretch' }}>
      <View style={{ width: DIAL, height: DIAL, alignItems: 'center', justifyContent: 'center' }}>
        {/* Sits behind the ring and only breathes while the clock is actually
            moving — a halo under a paused timer would claim progress that is
            not happening. */}
        <Halo size={DIAL + 120} ringSize={DIAL} color={c.accent} active={running && !done} />

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

      {done ? (
        <Animated.View
          entering={reduced ? undefined : FadeInDown.duration(360).springify().damping(18)}
          style={{ alignItems: 'center', gap: space.base, alignSelf: 'stretch' }}
        >
          {/* The app's one confetti burst, and the only place Pip appears on this
              screen. He is absent for the whole session on purpose: this is the
              screen you are meant to stop looking at, and its single ambient
              animation is the halo. He arrives when the timer stops, which is
              the moment there is finally something to celebrate — and it is a
              session the user actually finished, not a setup step. */}
          <View style={{ alignSelf: 'stretch', alignItems: 'center' }}>
            <Confetti height={250} />
            <PipScene pose="cheer" size={148} idle="bob" grounded={false} delay={80} />
          </View>

          <Txt variant="displaySm" style={{ textAlign: 'center' }}>
            {allStepsDone ? 'All of it, done 🎉' : 'Time is up. That counted.'}
          </Txt>

          {task && !task.done ? (
            <PressScale
              onPress={() => { haptic.success(); toggleTask(task.id); end(); }}
              accessibilityRole="button"
              style={{
                flexDirection: 'row', alignItems: 'center', gap: space.sm,
                height: 54, paddingHorizontal: space.xxl, justifyContent: 'center',
                borderRadius: radius.pill, backgroundColor: c.solid,
              }}
            >
              <Icon name="checkmark" size={15} color={c.onSolid} weight="bold" />
              <Txt variant="title" color={c.onSolid}>Mark it done</Txt>
            </PressScale>
          ) : null}

          <PressScale
            onPress={() => { haptic.tap(); end(); }}
            accessibilityRole="button"
            style={{
              height: 48, paddingHorizontal: space.xxl, justifyContent: 'center',
              borderRadius: radius.pill,
              backgroundColor: task && !task.done ? 'transparent' : c.solid,
            }}
          >
            <Txt variant="title" color={task && !task.done ? c.inkMuted : c.onSolid}>
              {task && !task.done ? 'Not yet' : 'Done'}
            </Txt>
          </PressScale>
        </Animated.View>
      ) : (
        <View style={{ alignItems: 'center', gap: space.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.lg }}>
            <PressScale
              onPress={() => { haptic.tick(); extend(60); }}
              accessibilityRole="button"
              accessibilityLabel="Add one minute"
              style={{
                height: 44, paddingHorizontal: space.lg, justifyContent: 'center',
                borderRadius: radius.pill, backgroundColor: c.surface, boxShadow: shadow[1],
              }}
            >
              <Txt variant="captionStrong">+ 1 min</Txt>
            </PressScale>

            <PressScale
              onPress={() => { haptic.bump(); running ? pause() : resume(); }}
              accessibilityRole="button"
              accessibilityLabel={running ? 'Pause' : 'Resume'}
              style={{
                width: 62, height: 62, borderRadius: 31,
                alignItems: 'center', justifyContent: 'center',
                backgroundColor: c.solid, boxShadow: shadow[2],
              }}
            >
              <Icon name={running ? 'pause.fill' : 'play.fill'} size={20} color={c.onSolid} weight="bold" />
            </PressScale>

            <PressScale
              onPress={confirmEnd}
              accessibilityRole="button"
              accessibilityLabel="End session"
              style={{
                height: 44, paddingHorizontal: space.lg, justifyContent: 'center',
                borderRadius: radius.pill, backgroundColor: c.surface, boxShadow: shadow[1],
              }}
            >
              <Txt variant="captionStrong">End</Txt>
            </PressScale>
          </View>

          {!running ? (
            <Animated.View entering={reduced ? undefined : FadeIn.duration(200)}>
              <Txt variant="micro" tone="faint">PAUSED</Txt>
            </Animated.View>
          ) : null}
        </View>
      )}

      {/* The routine's own steps, on the screen you are already staring at.
          Without these, focusing on a four-step routine means leaving the timer
          to tick each one off somewhere else. */}
      {steps.length > 0 ? (
        <View style={{ alignSelf: 'stretch', gap: space.sm }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Txt variant="micro" tone="faint">STEPS</Txt>
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
                <Checkbox checked={s.done} onToggle={() => { haptic.tick(); toggleStep(task!.id, s.id); }} size={22} subtle />
                <Txt
                  variant="body"
                  tone={s.done ? 'faint' : 'ink'}
                  style={s.done ? { textDecorationLine: 'line-through' } : undefined}
                  numberOfLines={2}
                >
                  {s.title}
                </Txt>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
}
