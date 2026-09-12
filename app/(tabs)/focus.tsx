import { useEffect, useMemo, useRef, useState } from 'react';
import { View, Pressable } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue, useAnimatedStyle, useDerivedValue, useAnimatedReaction,
  withTiming, withSpring, cancelAnimation, Easing, type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Txt } from '../../src/components/Txt';
import { Icon } from '../../src/components/Icon';
import { Ring } from '../../src/components/Ring';
import { EmojiAvatar } from '../../src/components/EmojiAvatar';
import { PressScale } from '../../src/components/Press';
import { TAB_BAR_HEIGHT } from '../../src/components/TabBar';
import { useTheme } from '../../src/theme/useTheme';
import { radius, space, motion } from '../../src/theme/tokens';
import { usePlanStore, remainingFor } from '../../src/store/usePlanStore';
import { formatTimer, formatDuration } from '../../src/lib/time';
import { haptic } from '../../src/lib/haptics';

const DIAL = 266;
const STROKE = 24;
const MAX_MIN = 60;

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

  return (
    <View style={{ flex: 1, backgroundColor: c.canvasTinted }}>
      <View
        style={{
          paddingTop: insets.top + space.sm,
          paddingHorizontal: space.lg,
          paddingBottom: space.base,
          alignItems: 'center',
          gap: space.xs,
        }}
      >
        <Txt variant="displayLg">Focus</Txt>
        <Txt variant="caption" tone="muted">
          {focus ? 'One thing, until the ring closes' : 'Pick how long you want to disappear for'}
        </Txt>
      </View>

      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: TAB_BAR_HEIGHT + insets.bottom }}>
        {focus ? (
          <Running task={activeTask} />
        ) : (
          <DialPicker task={paramTask} />
        )}
      </View>
    </View>
  );
}

/* ---------------------------------------------------------------- picker -- */

function DialPicker({ task }: { task: { id: string; title: string; emoji: string; tint: any; minutes: number } | null }) {
  const { c, shadow, isDark } = useTheme();
  const startFocus = usePlanStore((s) => s.startFocus);
  const minutes = useSharedValue(task ? Math.min(MAX_MIN, task.minutes) : 15);
  const [display, setDisplay] = useState(task ? Math.min(MAX_MIN, task.minutes) : 15);

  const progress = useDerivedValue(() => minutes.get() / MAX_MIN);

  // A detent every 5 minutes: bounded haptic frequency, and it feels like the
  // dial has teeth rather than buzzing continuously.
  useAnimatedReaction(
    () => Math.round(minutes.get() / 5),
    (cur, prev) => { if (prev !== null && cur !== prev) scheduleOnRN(haptic.tick); }
  );

  useAnimatedReaction(
    () => Math.max(1, Math.round(minutes.get())),
    (cur, prev) => { if (cur !== prev) scheduleOnRN(setDisplay, cur); }
  );

  const pan = Gesture.Pan()
    .onBegin((e) => {
      'worklet';
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

  return (
    <View style={{ alignItems: 'center', gap: space.xxl }}>
      <GestureDetector gesture={pan}>
        <View
          style={{ width: DIAL, height: DIAL, alignItems: 'center', justifyContent: 'center' }}
          accessibilityRole="adjustable"
          accessibilityLabel="Focus length"
          accessibilityValue={{ text: formatDuration(display) }}
        >
          <Ring size={DIAL} strokeWidth={STROKE} progress={progress} color={c.accent} track={c.accentSoft} />

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

      {task ? (
        <View
          style={{
            flexDirection: 'row', alignItems: 'center', gap: space.sm,
            paddingVertical: 6, paddingHorizontal: space.md, paddingRight: space.base,
            borderRadius: radius.pill, backgroundColor: c.surface,
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

function Running({ task }: { task: { title: string; emoji: string; tint: any } | null }) {
  const { c } = useTheme();
  const focus = usePlanStore((s) => s.focus)!;
  const pause = usePlanStore((s) => s.pauseFocus);
  const resume = usePlanStore((s) => s.resumeFocus);
  const extend = usePlanStore((s) => s.extendFocus);
  const end = usePlanStore((s) => s.endFocus);

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

  return (
    <View style={{ alignItems: 'center', gap: space.xl }}>
      <View style={{ width: DIAL, height: DIAL, alignItems: 'center', justifyContent: 'center' }}>
        <Ring size={DIAL} strokeWidth={STROKE} progress={progress} color={c.accent} track={c.accentSoft} />
        <View style={{ position: 'absolute', alignItems: 'center', gap: space.md }}>
          {task ? <EmojiAvatar emoji={task.emoji} tint={task.tint} size={72} /> : null}
          <Txt variant="numeral" tabular style={{ fontSize: task ? 40 : 56, lineHeight: task ? 46 : 62 }}>
            {formatTimer(left)}
          </Txt>
        </View>
      </View>

      {task ? (
        <Txt variant="title" numberOfLines={1} style={{ maxWidth: 280, textAlign: 'center' }}>{task.title}</Txt>
      ) : null}

      {done ? (
        <View style={{ alignItems: 'center', gap: space.base }}>
          <Txt variant="body" tone="muted">Time is up. That counted.</Txt>
          <PressScale
            onPress={() => { haptic.tap(); end(); }}
            accessibilityRole="button"
            style={{
              height: 54, paddingHorizontal: space.xxl, justifyContent: 'center',
              borderRadius: radius.pill, backgroundColor: c.solid,
            }}
          >
            <Txt variant="title" color={c.onSolid}>Done</Txt>
          </PressScale>
        </View>
      ) : (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.lg }}>
          <PressScale
            onPress={() => { haptic.tick(); extend(60); }}
            accessibilityRole="button"
            accessibilityLabel="Add one minute"
            style={{
              height: 44, paddingHorizontal: space.lg, justifyContent: 'center',
              borderRadius: radius.pill, backgroundColor: c.surface,
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
              alignItems: 'center', justifyContent: 'center', backgroundColor: c.solid,
            }}
          >
            <Icon name={running ? 'pause.fill' : 'play.fill'} size={20} color={c.onSolid} weight="bold" />
          </PressScale>

          <PressScale
            onPress={() => { haptic.warn(); end(); }}
            accessibilityRole="button"
            accessibilityLabel="End session"
            style={{
              height: 44, paddingHorizontal: space.lg, justifyContent: 'center',
              borderRadius: radius.pill, backgroundColor: c.surface,
            }}
          >
            <Txt variant="captionStrong">End</Txt>
          </PressScale>
        </View>
      )}
    </View>
  );
}
