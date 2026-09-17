import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Pressable, TextInput, ActionSheetIOS, Alert } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
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
import { PressScale } from '../../src/components/Press';
import { useTheme } from '../../src/theme/useTheme';
import { radius, space } from '../../src/theme/tokens';
import { useT } from '../../src/i18n';
import { usePlanStore, stepProgress } from '../../src/store/usePlanStore';
import { tagLabel, TAGS, DURATIONS, START_TIMES } from '../../src/data/seed';
import {
  formatDuration, formatClock, slotLabel, dateKey, addDays, longDate, isToday,
  SLOT_ORDER, parseKey, type Slot,
} from '../../src/lib/time';
import { isRoutineTask } from '../../src/data/routines';
import { haptic } from '../../src/lib/haptics';
import type { Priority } from '../../src/store/types';

/** The emoji disc's size in a `TaskRow`, and here. Their ratio is the whole of
 *  the shared-element illusion — see `Rise`. */
const AVATAR_IN_ROW = 40;
const AVATAR_IN_HERO = 84;

/** The inbox buckets, in the order the To-do screen lists them. */
const PRIORITIES: Priority[] = ['high', 'medium', 'low', 'todo'];

export default function TaskDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { c, shadow, isDark } = useTheme();
  const { t } = useT();
  const [draft, setDraft] = useState('');
  const [editingTitle, setEditingTitle] = useState(false);
  /**
   * The live title, in a REF rather than state — the same trap the To-do
   * composer and the routines composer both document: React state lags the
   * native input by a render, so committing from state truncates what a fast
   * typist just wrote.
   */
  const titleRef = useRef('');

  const task = usePlanStore((s) => s.tasks.find((t) => t.id === id));
  const toggleTask = usePlanStore((s) => s.toggleTask);
  const toggleStep = usePlanStore((s) => s.toggleStep);
  const addStep = usePlanStore((s) => s.addStep);
  const removeStep = usePlanStore((s) => s.removeStep);
  const removeTask = usePlanStore((s) => s.removeTask);
  const updateTask = usePlanStore((s) => s.updateTask);

  const progress = useMemo(() => (task ? stepProgress(task) : { done: 0, total: 0 }), [task]);

  /**
   * ── EVERY HOOK ON THIS SCREEN RUNS BEFORE THE `!task` GUARD BELOW ─────────
   * The guard is an early `return`, so anything hook-shaped underneath it is
   * called on some renders and not others. That is not a style point: deleting
   * an activity re-renders this very screen with `task` undefined on the way
   * out, so a hook below the guard would make React see a different hook count
   * between two renders of the same component and throw — turning "delete this
   * activity" into a crash. Everything that has to be a hook lives up here;
   * everything that merely needs `task` lives below, where it is narrowed.
   */
  /** One field, one sheet. Falls back to an Alert where there is no sheet. */
  const choose = useCallback(
    (title: string, labels: string[], onPick: (i: number) => void) => {
      haptic.tap();
      if (process.env.EXPO_OS === 'ios') {
        ActionSheetIOS.showActionSheetWithOptions(
          {
            options: [...labels, t('common.cancel')],
            cancelButtonIndex: labels.length,
            title,
            userInterfaceStyle: isDark ? 'dark' : 'light',
          },
          (i) => { if (i < labels.length) { haptic.tick(); onPick(i); } }
        );
      } else {
        Alert.alert(title, undefined, [
          ...labels.map((text, i) => ({
            text,
            onPress: () => { haptic.tick(); onPick(i); },
          })),
          { text: t('common.cancel'), style: 'cancel' as const },
        ]);
      }
    },
    [t, isDark]
  );

  /**
   * Holds the in-progress rename across an unmount — see the note where these
   * are filled in, below the guard.
   */
  const editingRef = useRef(false);
  const saveRef = useRef<(value: string) => void>(() => {});
  useEffect(() => () => {
    if (editingRef.current) saveRef.current(titleRef.current);
  }, []);

  // Deleted from under us (or a stale deep link) — say so rather than crash.
  if (!task) {
    return (
      <View style={{ flex: 1, backgroundColor: c.canvas, alignItems: 'center', justifyContent: 'center', gap: space.base, padding: space.xl }}>
        <Icon name="questionmark.circle" size={36} color={c.inkFaint} />
        <Txt variant="displaySm" style={{ textAlign: 'center' }}>{t('task.goneTitle')}</Txt>
        <Txt variant="body" tone="muted" style={{ textAlign: 'center' }}>
          {t('task.goneBody')}
        </Txt>
        <Button
          label={t('task.backToToday')}
          fullWidth={false}
          onPress={() => router.dismissTo('/(tabs)/today')}
        />
      </View>
    );
  }

  /**
   * EVERYTHING ON THIS SCREEN IS NOW EDITABLE, AND NONE OF IT USED TO BE.
   *
   * The meta pills below — duration, start time, time of day, tag — were plain
   * text. Every one of those fields is chosen once, in the add sheet, in the
   * first ten seconds of an activity's life, and could never be changed again:
   * a 15-minute guess stayed 15 minutes, something filed under Morning could
   * not move to Evening, and an activity put on the wrong day was stuck there
   * forever. The only edits the app offered were ticking it, adding steps to
   * it, and deleting it and starting over.
   *
   * That is not what the reference class does. Tiimo's "Edit task" opens on
   * exactly these fields (time of day, date, duration, sub-tasks); Structured,
   * Todoist, Evernote and ClickUp all put them on tappable rows in the detail
   * view. Picking an action sheet per field rather than a separate edit form
   * follows those detail screens — the value you are changing stays visible
   * behind the sheet, and there is no save step to forget.
   */
  const routine = isRoutineTask(task.id);

  /**
   * An empty rename is a cancel, not a nameless activity. Blur commits, which
   * is what makes tapping anywhere else on the screen a safe way out.
   */
  const saveTitle = (value: string) => {
    const v = value.trim();
    if (!v || v === task.title) return;
    haptic.tick();
    updateTask(task.id, { title: v });
  };

  const commitTitle = (submitted?: string) => {
    setEditingTitle(false);
    saveTitle(submitted ?? titleRef.current);
  };

  /**
   * ── LEAVING THE SCREEN MID-RENAME MUST NOT THROW THE RENAME AWAY ──────────
   * The commit hangs off `onBlur`, which covers tapping elsewhere on the
   * screen and covers the return key. It does NOT cover leaving: tapping Back,
   * or swiping the screen away, unmounts the `TextInput` without ever blurring
   * it, so a rename that had been typed but not dismissed was silently
   * discarded — and "I typed it and went back" is the ordinary way to finish
   * an inline edit, not an edge case.
   *
   * The refs are what make an unmount handler correct: the cleanup below runs
   * once, with the closure it was created in, so reading the live title and
   * the live "am I editing" out of refs is the only way it sees the values as
   * they were when the screen went away. It calls `saveTitle` rather than
   * `commitTitle` because there is no longer any component to set state on.
   */
  /**
   * WRITTEN IN AN EFFECT, NOT DURING RENDER.
   *
   * These were assigned in the component body, which mutates a ref during the
   * render phase. React is allowed to render a component and throw the result
   * away — concurrent rendering, a Suspense retry, StrictMode's double
   * invocation — and an abandoned render still runs a body-level assignment.
   * The unmount handler below would then commit a title taken from a render
   * that never happened. An effect only runs for renders that commit, which is
   * exactly the set these refs are supposed to describe.
   */
  useEffect(() => {
    editingRef.current = editingTitle;
    saveRef.current = saveTitle;
  });


  const editDuration = () =>
    choose(t('task.duration'), DURATIONS.map(formatDuration), (i) =>
      updateTask(task.id, { minutes: DURATIONS[i] })
    );

  const editSlot = () =>
    choose(t('task.whenSlot'), SLOT_ORDER.map(slotLabel), (i) => {
      const slot = SLOT_ORDER[i];
      // A start time belonging to the old slot would contradict the new one —
      // the add sheet clears it for the same reason.
      updateTask(task.id, {
        slot,
        startMinutes:
          task.startMinutes != null && START_TIMES[slot].includes(task.startMinutes)
            ? task.startMinutes
            : null,
      });
    });

  const editStart = () => {
    const times = START_TIMES[task.slot];
    const labels = [t('task.noSetTime'), ...times.map(formatClock)];
    choose(t('task.startsAt'), labels, (i) =>
      updateTask(task.id, { startMinutes: i === 0 ? null : times[i - 1] })
    );
  };

  const editTag = () => {
    const labels = [t('task.noTag'), ...TAGS.map(tagLabel)];
    choose(t('task.tagField'), labels, (i) =>
      updateTask(task.id, { tag: i === 0 ? null : TAGS[i - 1] })
    );
  };

  /**
   * MOVING AN ACTIVITY BETWEEN DAYS — the edit whose absence stranded work.
   *
   * Anything not ticked before midnight simply fell off the app: Today renders
   * one date, and there was no way to bring a past activity forward. Today's
   * overdue group is the bulk answer; this is the single-activity one, and it
   * also covers the opposite case of pushing something to tomorrow.
   *
   * The To-do list is offered as a destination because it is the same move:
   * "not on a particular day" is what a null date means here.
   */
  const editDay = () => {
    const today = dateKey(new Date());
    const tomorrow = dateKey(addDays(new Date(), 1));
    const labels = [t('task.moveToday'), t('task.moveTomorrow'), t('task.moveInbox')];
    choose(t('task.moveTitle'), labels, (i) => {
      if (i === 2) { updateTask(task.id, { date: null }); return; }
      updateTask(task.id, { date: i === 0 ? today : tomorrow });
    });
  };

  // `PRIORITIES` is a module constant (see the top of the file); only the
  // labels depend on the language, so only they are built here.
  const priorityLabel: Record<Priority, string> = {
    high: t('todo.high'), medium: t('todo.medium'), low: t('todo.low'), todo: t('todo.plain'),
  };

  const editPriority = () =>
    choose(t('task.priority'), PRIORITIES.map((p) => priorityLabel[p]), (i) =>
      updateTask(task.id, { priority: PRIORITIES[i] })
    );

  const dayValue =
    task.date == null
      ? t('task.inboxValue')
      : isToday(task.date)
        ? t('task.moveToday')
        : longDate(parseKey(task.date));

  const confirmDelete = () => {
    const doDelete = () => { haptic.warn(); removeTask(task.id); router.back(); };
    if (process.env.EXPO_OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: [t('task.deleteActivity'), t('common.cancel')],
          destructiveButtonIndex: 0,
          cancelButtonIndex: 1,
          title: task.title,
        },
        (i) => { if (i === 0) doDelete(); }
      );
    } else {
      Alert.alert(task.title, undefined, [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('common.delete'), style: 'destructive', onPress: doDelete },
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
        <CircleButton icon="chevron.left" label={t('common.back')} onPress={() => router.back()} />
        <CircleButton icon="trash" label={t('task.deleteActivity')} onPress={confirmDelete} />
      </View>

      {/*
        KEYBOARD-AWARE, like the add sheet.

        The "add a step" field is the last thing on this screen and the bottom
        bar is pinned over it, so raising the keyboard put the caret behind the
        keyboard on anything but the shortest activity — you could type but not
        see what you were typing. The add sheet already solved this with the
        same component; this screen had a plain ScrollView with no inset at all.
      */}
      <KeyboardAwareScrollView
        bottomOffset={24}
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
            {/*
              THE TITLE IS EDITABLE IN PLACE.

              Renaming is the single most likely change to an activity and it
              was the one thing this screen could not do — the text was
              `selectable`, which lets you copy your own words but not correct
              them. Editing in place rather than behind a dialog is what Linear
              and Todoist do, and it is the only option that works on both
              platforms: `Alert.prompt` is iOS-only.

              A DONE activity keeps its strikethrough and is not editable: the
              row is a record at that point, and the struck text cannot be laid
              over an input without the rule drifting off the glyphs.
            */}
            {editingTitle && !task.done && !routine ? (
              <TextInput
                autoFocus
                defaultValue={task.title}
                onChangeText={(v) => { titleRef.current = v; }}
                onBlur={() => commitTitle()}
                onSubmitEditing={(e) => commitTitle(e.nativeEvent.text)}
                returnKeyType="done"
                submitBehavior="blurAndSubmit"
                accessibilityLabel={t('task.renameTitle')}
                placeholder={t('task.renamePlaceholder')}
                placeholderTextColor={c.inkFaint}
                style={{
                  color: c.ink, textAlign: 'center',
                  fontFamily: 'PlayfairDisplay_600SemiBold', fontSize: 28, lineHeight: 34,
                  paddingVertical: space.xs,
                  borderBottomWidth: 1.5, borderBottomColor: c.accent,
                }}
              />
            ) : (
              <Pressable
                onPress={() => {
                  if (task.done || routine) return;
                  haptic.tap();
                  titleRef.current = task.title;
                  setEditingTitle(true);
                }}
                accessibilityRole="button"
                accessibilityLabel={t('task.renameTitle')}
              >
                <Strike
                  struck={task.done}
                  identity={task.id}
                  variant="displayMd"
                  style={{ textAlign: 'center' }}
                >
                  {task.title}
                </Strike>
              </Pressable>
            )}
          </Rise>

          <Rise delay={200}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: space.sm }}>
              {/*
                Every pill is a control now. They keep the pill shape they had
                as read-only metadata because the information is still the
                point — the chevron is what says it can be changed, and it is
                small enough that the row still reads as a summary rather than
                as a form.

                A ROUTINE'S FIELDS ARE ALL READ-ONLY HERE, and that is the
                honest answer rather than a missing feature. Every one of them
                — the title, the summed duration, the slot, the start time, the
                tag, the day — is REGENERATED from `profile` each morning by
                `ensureToday`. Offering an editor for a value that the next
                rebuild overwrites would be the worst kind of control: it works,
                it persists, and then it silently forgets overnight.

                The steps stay tappable, because ticking them is the entire
                point of the row, and today's ticks are explicitly carried
                across a rebuild. The link below points at the screen that does
                own these fields.
              */}
              <Field
                icon="clock"
                label={formatDuration(task.minutes)}
                field={t('task.duration')}
                onPress={routine ? undefined : editDuration}
              />
              <Field
                icon="clock.arrow.circlepath"
                label={task.startMinutes != null ? formatClock(task.startMinutes) : t('task.noSetTime')}
                field={t('task.startsAt')}
                onPress={!routine && START_TIMES[task.slot].length > 0 ? editStart : undefined}
              />
              <Field
                icon="sun.max"
                label={slotLabel(task.slot)}
                field={t('task.whenSlot')}
                onPress={routine ? undefined : editSlot}
              />
              <Field
                icon="calendar"
                label={dayValue}
                field={t('task.dateField')}
                onPress={routine ? undefined : editDay}
              />
              {task.date == null ? (
                <Field
                  icon="flag"
                  label={priorityLabel[task.priority]}
                  field={t('task.priority')}
                  onPress={editPriority}
                />
              ) : null}
              <Field
                icon="tag"
                label={task.tag ? tagLabel(task.tag) : t('task.noTag')}
                field={t('task.tagField')}
                onPress={routine ? undefined : editTag}
              />
            </View>
            {routine ? (
              <View style={{ alignItems: 'center', paddingTop: space.sm }}>
                <PressScale
                  onPress={() => { haptic.tap(); router.push('/routines'); }}
                  accessibilityRole="button"
                  accessibilityLabel={t('task.editInRoutines')}
                  hitSlop={8}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}
                >
                  <Icon name="repeat" size={11} color={c.accentInk} weight="semibold" />
                  <Txt variant="caption" tone="accent">{t('task.editInRoutines')}</Txt>
                </PressScale>
              </View>
            ) : null}
          </Rise>
        </View>

        <View style={{ gap: space.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Txt variant="micro" tone="faint">{t('task.steps')}</Txt>
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
                <Txt variant="bodyStrong" tone="muted">{t('task.noStepsTitle')}</Txt>
                <Txt variant="caption" tone="faint">
                  {t('task.noStepsBody')}
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
                    hitSlop={10}
                    accessibilityRole="button"
                    accessibilityLabel={t('task.remove', { title: s.title })}
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
              placeholder={t('task.addStep')}
              placeholderTextColor={c.inkFaint}
              returnKeyType="done"
              style={{ flex: 1, color: c.ink, fontFamily: 'Inter_400Regular', fontSize: 15, paddingVertical: space.md }}
            />
            <Icon name="plus" size={14} color={c.inkFaint} weight="semibold" />
          </View>
        </View>
      </KeyboardAwareScrollView>

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
            label={t(task.done ? 'task.markNotDone' : 'task.markDone')}
            variant={task.done ? 'outline' : 'solid'}
            onPress={() => { task.done ? haptic.tap() : haptic.success(); toggleTask(task.id); }}
          />
        </View>
        <Button
          label={t('task.focus')}
          variant="soft"
          icon="timer"
          fullWidth={false}
          onPress={() => { haptic.bump(); router.push({ pathname: '/(tabs)/focus', params: { taskId: task.id } }); }}
        />
      </View>
    </View>
  );
}

/**
 * One field of the activity, as a pill.
 *
 * With `onPress` it is a control and says so — a chevron, a press response, and
 * an accessibility label that names the FIELD as well as its value, because
 * "20m" on its own tells a screen reader nothing about what it would be
 * changing. Without `onPress` it is the plain metadata it always was, which is
 * what a routine's derived duration stays.
 */
function Field({
  icon, label, field, onPress,
}: {
  icon: Parameters<typeof Icon>[0]['name'];
  label: string;
  field: string;
  onPress?: () => void;
}) {
  const { c } = useTheme();
  const { t } = useT();

  const body = (
    <>
      <Icon name={icon} size={11} color={c.inkMuted} weight="semibold" />
      <Txt variant="caption" tone="muted">{label}</Txt>
      {onPress ? (
        <Icon name="chevron.down" size={9} color={c.inkFaint} weight="bold" />
      ) : null}
    </>
  );

  const style = {
    flexDirection: 'row' as const, alignItems: 'center' as const, gap: 5,
    paddingVertical: 6, paddingHorizontal: space.md,
    borderRadius: radius.pill, backgroundColor: c.surfaceSunken,
  };

  if (!onPress) {
    return (
      <View accessible accessibilityLabel={`${field}: ${label}`} style={style}>
        {body}
      </View>
    );
  }

  return (
    <PressScale
      onPress={onPress}
      scaleTo={0.95}
      hitSlop={4}
      accessibilityRole="button"
      accessibilityLabel={t('task.editA11y', { field, value: label })}
      style={style}
    >
      {body}
    </PressScale>
  );
}
