import { useMemo, useState } from 'react';
import { View, ScrollView, Pressable, TextInput, ActionSheetIOS, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Txt } from '../../src/components/Txt';
import { Icon } from '../../src/components/Icon';
import { Checkbox } from '../../src/components/Checkbox';
import { Strike } from '../../src/components/Strike';
import { Rise } from '../../src/components/Rise';
import { EmojiAvatar } from '../../src/components/EmojiAvatar';
import { ProgressBar } from '../../src/components/ProgressBar';
import { Button } from '../../src/components/Button';
import { CircleButton } from '../../src/components/DayHeader';
import { useTheme } from '../../src/theme/useTheme';
import { radius, space } from '../../src/theme/tokens';
import { usePlanStore, stepProgress } from '../../src/store/usePlanStore';
import { formatDuration, formatClock, SLOT_LABEL } from '../../src/lib/time';
import { haptic } from '../../src/lib/haptics';

/** The emoji disc's size in a `TaskRow`, and here. Their ratio is the whole of
 *  the shared-element illusion — see `Rise`. */
const AVATAR_IN_ROW = 40;
const AVATAR_IN_HERO = 84;

export default function TaskDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { c, shadow } = useTheme();
  const [draft, setDraft] = useState('');

  const task = usePlanStore((s) => s.tasks.find((t) => t.id === id));
  const toggleTask = usePlanStore((s) => s.toggleTask);
  const toggleStep = usePlanStore((s) => s.toggleStep);
  const addStep = usePlanStore((s) => s.addStep);
  const removeStep = usePlanStore((s) => s.removeStep);
  const removeTask = usePlanStore((s) => s.removeTask);

  const progress = useMemo(() => (task ? stepProgress(task) : { done: 0, total: 0 }), [task]);

  // Deleted from under us (or a stale deep link) — say so rather than crash.
  if (!task) {
    return (
      <View style={{ flex: 1, backgroundColor: c.canvas, alignItems: 'center', justifyContent: 'center', gap: space.base, padding: space.xl }}>
        <Icon name="questionmark.circle" size={36} color={c.inkFaint} />
        <Txt variant="displaySm" style={{ textAlign: 'center' }}>This activity is gone</Txt>
        <Txt variant="body" tone="muted" style={{ textAlign: 'center' }}>
          It was deleted, or the link is out of date.
        </Txt>
        <Button label="Back to today" fullWidth={false} onPress={() => router.dismissTo('/(tabs)/today')} />
      </View>
    );
  }

  const confirmDelete = () => {
    const doDelete = () => { haptic.warn(); removeTask(task.id); router.back(); };
    if (process.env.EXPO_OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: ['Delete activity', 'Cancel'], destructiveButtonIndex: 0, cancelButtonIndex: 1, title: task.title },
        (i) => { if (i === 0) doDelete(); }
      );
    } else {
      Alert.alert(task.title, undefined, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: doDelete },
      ]);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.canvas }}>
      <View
        style={{
          flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
          paddingTop: insets.top + space.sm, paddingHorizontal: space.lg, paddingBottom: space.sm,
        }}
      >
        <CircleButton icon="chevron.left" label="Back" onPress={() => router.back()} />
        <CircleButton icon="trash" label="Delete activity" onPress={confirmDelete} />
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: space.lg, paddingBottom: insets.bottom + 120, gap: space.xl }}
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* The arrival. Three beats, 70ms apart, each overlapping the tail of
            the platform push — so the screen assembles as it lands rather than
            sliding in already finished. `fromScale` is the disc's size in the
            row you tapped divided by its size here, which is what gives the
            emoji its continuity with the list. */}
        <View style={{ alignItems: 'center', gap: space.base, paddingTop: space.sm }}>
          <Rise delay={60} fromScale={AVATAR_IN_ROW / AVATAR_IN_HERO} distance={8}>
            <EmojiAvatar emoji={task.emoji} tint={task.tint} size={AVATAR_IN_HERO} dimmed={task.done} />
          </Rise>

          <Rise delay={130} style={{ alignSelf: 'stretch' }}>
            <Strike
              struck={task.done}
              identity={task.id}
              variant="displayMd"
              selectable
              style={{ textAlign: 'center' }}
            >
              {task.title}
            </Strike>
          </Rise>

          <Rise delay={200}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: space.sm }}>
              <Meta icon="clock" label={formatDuration(task.minutes)} />
              {task.startMinutes != null ? <Meta icon="calendar" label={formatClock(task.startMinutes)} /> : null}
              <Meta icon="sun.max" label={SLOT_LABEL[task.slot]} />
              {task.tag ? <Meta icon="tag" label={task.tag} /> : null}
            </View>
          </Rise>
        </View>

        <View style={{ gap: space.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Txt variant="micro" tone="faint">STEPS</Txt>
            {progress.total > 0 ? (
              <Txt variant="micro" tone="muted" tabular>{progress.done}/{progress.total}</Txt>
            ) : null}
          </View>

          {progress.total > 0 ? (
            <ProgressBar value={progress.done / progress.total} />
          ) : null}

          <View style={{ borderRadius: radius.card, borderCurve: 'continuous', backgroundColor: c.surface, boxShadow: shadow[1], overflow: 'hidden' }}>
            {task.steps.length === 0 ? (
              <View style={{ padding: space.base, gap: 4 }}>
                <Txt variant="bodyStrong" tone="muted">No steps yet</Txt>
                <Txt variant="caption" tone="faint">
                  Breaking this into two or three steps usually makes starting easier.
                </Txt>
              </View>
            ) : (
              task.steps.map((s, i) => (
                <View
                  key={s.id}
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
                    onToggle={() => { haptic.tick(); toggleStep(task.id, s.id); }}
                    size={22}
                    subtle
                  />
                  <View style={{ flex: 1 }}>
                    <Strike struck={s.done} identity={s.id} variant="body" tone="ink">
                      {s.title}
                    </Strike>
                  </View>
                  <Pressable
                    onPress={() => { haptic.tap(); removeStep(task.id, s.id); }}
                    hitSlop={10} accessibilityRole="button" accessibilityLabel={`Remove ${s.title}`}
                  >
                    <Icon name="xmark" size={12} color={c.inkFaint} weight="semibold" />
                  </Pressable>
                </View>
              ))
            )}
          </View>

          <View
            style={{
              flexDirection: 'row', alignItems: 'center', gap: space.sm,
              borderRadius: radius.input, borderCurve: 'continuous', borderWidth: 1.5, borderStyle: 'dashed',
              borderColor: c.hairline, paddingHorizontal: space.base, minHeight: 48,
            }}
          >
            <TextInput
              value={draft}
              onChangeText={setDraft}
              onSubmitEditing={() => {
                const v = draft.trim();
                if (!v) return;
                haptic.tick(); addStep(task.id, v); setDraft('');
              }}
              submitBehavior="submit"
              placeholder="Add a step"
              placeholderTextColor={c.inkFaint}
              returnKeyType="done"
              style={{ flex: 1, color: c.ink, fontFamily: 'Inter_400Regular', fontSize: 15, paddingVertical: space.md }}
            />
            <Icon name="plus" size={14} color={c.inkFaint} weight="semibold" />
          </View>
        </View>
      </ScrollView>

      <View
        style={{
          position: 'absolute', left: 0, right: 0, bottom: 0,
          flexDirection: 'row', gap: space.md,
          paddingHorizontal: space.lg, paddingTop: space.md,
          paddingBottom: Math.max(insets.bottom, space.base),
          backgroundColor: c.canvas, borderTopWidth: 1, borderTopColor: c.hairline,
        }}
      >
        <View style={{ flex: 1 }}>
          <Button
            label={task.done ? 'Mark as not done' : 'Mark as done'}
            variant={task.done ? 'outline' : 'solid'}
            onPress={() => { task.done ? haptic.tap() : haptic.success(); toggleTask(task.id); }}
          />
        </View>
        <Button
          label="Focus"
          variant="soft"
          icon="timer"
          fullWidth={false}
          onPress={() => { haptic.bump(); router.push({ pathname: '/(tabs)/focus', params: { taskId: task.id } }); }}
        />
      </View>
    </View>
  );
}

function Meta({ icon, label }: { icon: Parameters<typeof Icon>[0]['name']; label: string }) {
  const { c } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row', alignItems: 'center', gap: 5,
        paddingVertical: 6, paddingHorizontal: space.md,
        borderRadius: radius.pill, backgroundColor: c.surfaceSunken,
      }}
    >
      <Icon name={icon} size={11} color={c.inkMuted} weight="semibold" />
      <Txt variant="caption" tone="muted">{label}</Txt>
    </View>
  );
}
