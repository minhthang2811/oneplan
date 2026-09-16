import { useState } from 'react';
import { View, Pressable } from 'react-native';
import Animated, { FadeIn, FadeOut, useAnimatedStyle, useSharedValue, withTiming, useReducedMotion } from 'react-native-reanimated';
import { useEffect } from 'react';
import { Txt } from './Txt';
import { Icon } from './Icon';
import { Checkbox } from './Checkbox';
import { Strike } from './Strike';
import { EmojiAvatar } from './EmojiAvatar';
import { ProgressBar } from './ProgressBar';
import { PressHighlight, EASE } from './Press';
import { useTheme } from '../theme/useTheme';
import { useT } from '../i18n';
import { radius, space } from '../theme/tokens';
import { formatDuration, formatClock } from '../lib/time';
import { haptic } from '../lib/haptics';
import type { Task } from '../store/types';

type Props = {
  task: Task;
  onToggle: () => void;
  onToggleStep: (stepId: string) => void;
  onPress: () => void;
  onStartFocus?: () => void;
  /** Renders the "Start now" affordance — only ever on one row at a time. */
  isNow?: boolean;
  showTime?: boolean;
};

export function TaskRow({
  task, onToggle, onToggleStep, onPress, onStartFocus, isNow, showTime,
}: Props) {
  const { c, shadow } = useTheme();
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const done = task.steps.filter((s) => s.done).length;
  const total = task.steps.length;

  const rot = useSharedValue(0);
  const reduced = useReducedMotion();
  useEffect(() => {
    rot.set(reduced ? (open ? 180 : 0) : withTiming(open ? 180 : 0, { duration: 200, easing: EASE }));
  }, [open, reduced, rot]);
  const chev = useAnimatedStyle(() => ({ transform: [{ rotate: `${rot.get()}deg` }] }));

  return (
    <View style={{ borderRadius: radius.card, borderCurve: 'continuous', backgroundColor: c.surface, boxShadow: shadow[1], overflow: 'hidden' }}>
      {/*
        THE CHECKBOX INSIDE THIS ROW IS UNREACHABLE WITH VOICEOVER, AND THAT IS
        WHY THIS ROW EXPOSES A CUSTOM ACTION.

        iOS treats a view with an accessibility role and label as a single
        accessibility ELEMENT and does not expose its descendants separately.
        This row is such an element, so every control nested inside it —
        including the completion checkbox — is swallowed. A sighted user can tap
        the box; a VoiceOver user could only ever activate the row, which
        navigates to the detail screen. Completing an activity from the list was
        therefore impossible with a screen reader, which is a bad hole in an app
        whose whole premise is making a day easier to act on.

        The fix is the platform's own answer to this shape: a custom action, on
        the row, surfaced by the VoiceOver rotor. Flattening the row instead —
        dropping the role so the box is exposed — would cost the row's own
        "open this activity" affordance, which is the more common action of the
        two. The action's label tracks `done` so the rotor says what it will
        actually do rather than naming the state it is in.
      */}
      <PressHighlight
        onPress={onPress}
        baseColor={c.surface}
        pressColor={c.surfaceSunken}
        accessibilityRole="button"
        accessibilityLabel={t(task.done ? 'row.a11yCompleted' : 'row.a11y', {
          title: task.title,
          duration: formatDuration(task.minutes),
        })}
        accessibilityActions={[
          { name: 'toggle', label: t(task.done ? 'row.markNotDone' : 'row.markDone') },
        ]}
        onAccessibilityAction={(e) => {
          if (e.nativeEvent.actionName !== 'toggle') return;
          task.done ? haptic.tap() : haptic.success();
          onToggle();
        }}
        style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md }}
      >
        <EmojiAvatar emoji={task.emoji} tint={task.tint} dimmed={task.done} />

        <View style={{ flex: 1, gap: 2 }}>
          {isNow && !task.done ? (
            <View style={{ alignSelf: 'flex-start' }}>
              <View style={{
                flexDirection: 'row', alignItems: 'center', gap: 4,
                backgroundColor: c.accentSoft, paddingHorizontal: space.sm, paddingVertical: 3,
                borderRadius: radius.pill, marginBottom: 3,
              }}>
                <Icon name="play.fill" size={9} color={c.accentInk} weight="bold" />
                <Txt variant="micro" tone="accent">{t('row.now')}</Txt>
              </View>
            </View>
          ) : null}

          <Strike
            struck={task.done}
            identity={task.id}
            variant="bodyStrong"
            tone="ink"
            numberOfLines={2}
          >
            {task.title}
          </Strike>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Txt variant="caption" tone="muted" tabular>{formatDuration(task.minutes)}</Txt>
            {showTime && task.startMinutes != null ? (
              <>
                <View style={{ width: 3, height: 3, borderRadius: 2, backgroundColor: c.inkFaint }} />
                <Txt variant="caption" tone="muted" tabular>{formatClock(task.startMinutes)}</Txt>
              </>
            ) : null}
          </View>
        </View>

        {onStartFocus && isNow && !task.done ? (
          <Pressable
            onPress={() => { haptic.bump(); onStartFocus(); }}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={t('row.startFocusOn', { title: task.title })}
            style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: c.accentSoft, alignItems: 'center', justifyContent: 'center' }}
          >
            <Icon name="timer" size={15} color={c.accentInk} weight="semibold" />
          </Pressable>
        ) : null}

        <Checkbox
          checked={task.done}
          identity={task.id}
          label={task.title}
          onToggle={() => { task.done ? haptic.tap() : haptic.success(); onToggle(); }}
        />
      </PressHighlight>

      {total > 0 ? (
        <>
          <Pressable
            onPress={() => { haptic.tap(); setOpen((o) => !o); }}
            accessibilityRole="button"
            accessibilityLabel={t('row.stepsDone', { done, total })}
            accessibilityState={{ expanded: open }}
            style={{
              flexDirection: 'row', alignItems: 'center', gap: space.sm,
              backgroundColor: c.surfaceSunken,
              paddingHorizontal: space.md, paddingVertical: space.sm,
            }}
          >
            <View style={{ flex: 1 }}>
              <ProgressBar value={total ? done / total : 0} height={5} track={c.hairline} />
            </View>
            <Txt variant="micro" tone="muted" tabular>{done}/{total}</Txt>
            <Animated.View style={chev}>
              <Icon name="chevron.down" size={11} color={c.inkFaint} weight="bold" />
            </Animated.View>
          </Pressable>

          {open ? (
            <Animated.View
              entering={reduced ? undefined : FadeIn.duration(180)}
              exiting={reduced ? undefined : FadeOut.duration(120)}
              style={{ paddingHorizontal: space.md, paddingBottom: space.md, paddingTop: space.xs, gap: 2 }}
            >
              {task.steps.map((s) => (
                <Pressable
                  key={s.id}
                  onPress={() => { haptic.tick(); onToggleStep(s.id); }}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: s.done }}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: 12 }}
                >
                  <Checkbox
                    checked={s.done}
                    identity={s.id}
                    label={s.title}
                    onToggle={() => { haptic.tick(); onToggleStep(s.id); }}
                    size={20}
                    subtle
                  />
                  <Strike struck={s.done} identity={s.id} variant="body" tone="muted">
                    {s.title}
                  </Strike>
                </Pressable>
              ))}
            </Animated.View>
          ) : null}
        </>
      ) : null}
    </View>
  );
}
