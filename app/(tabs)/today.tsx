import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { View, Pressable, ActionSheetIOS, Alert, AccessibilityInfo } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Txt } from '../../src/components/Txt';
import { Icon } from '../../src/components/Icon';
import { PressScale } from '../../src/components/Press';
import { TaskRow } from '../../src/components/TaskRow';
import { SlotChip, SlotEmpty } from '../../src/components/SlotChip';
import { DayHeader } from '../../src/components/DayHeader';
import { Bloom } from '../../src/components/Bloom';
import { PupuScene } from '../../src/components/mascot/PupuScene';
import { Button } from '../../src/components/Button';
import { TAB_BAR_HEIGHT } from '../../src/components/TabBar';
import { ScrollEdge } from '../../src/components/ScrollEdge';
import { useChromeScroll } from '../../src/components/Chrome';
import { SlotCelebration, useSlotCompletion } from '../../src/components/SlotCelebration';
import { useTheme } from '../../src/theme/useTheme';
import { radius, space } from '../../src/theme/tokens';
import { useT } from '../../src/i18n';
import { usePlanStore, tasksForDate, bySlot } from '../../src/store/usePlanStore';
import { dateKey, parseKey, isToday, weekdayLong, longDate, SLOT_ORDER, slotLabel, type Slot } from '../../src/lib/time';
import { useNowMinutes } from '../../src/lib/useNowMinutes';
import { useToday } from '../../src/lib/useTodayKey';
import { isRoutineTask } from '../../src/data/routines';
import { haptic } from '../../src/lib/haptics';
import type { Task } from '../../src/store/types';

type Row =
  | { kind: 'section'; slot: Slot; count: number }
  | { kind: 'task'; task: Task; isNow: boolean }
  | { kind: 'empty'; slot: Slot }
  | { kind: 'overdue'; count: number }
  | { kind: 'overdueTask'; task: Task };

export default function Today() {
  const [date, setDate] = useState(() => new Date());
  const [collapsed, setCollapsed] = useState<Partial<Record<Slot, boolean>>>({});
  const insets = useSafeAreaInsets();
  const { c, isDark } = useTheme();
  const { t } = useT();
  const { scroll, reset: resetChrome } = useChromeScroll();

  const tasks = usePlanStore((s) => s.tasks);
  const layout = usePlanStore((s) => s.layout);
  const toggleTask = usePlanStore((s) => s.toggleTask);
  const toggleStep = usePlanStore((s) => s.toggleStep);
  const setLayout = usePlanStore((s) => s.setLayout);
  const carryOver = usePlanStore((s) => s.carryOver);
  const carryOverDeclinedOn = usePlanStore((s) => s.carryOverDeclinedOn);
  const declineCarryOver = usePlanStore((s) => s.declineCarryOver);
  const reofferCarryOver = usePlanStore((s) => s.reofferCarryOver);

  const key = dateKey(date);
  // Live clock: "now" depends on time passing, not on the task list changing.
  const now = useNowMinutes();

  /**
   * THE DAY TURNING OVER MOVES THE SCREEN WITH IT.
   *
   * `date` was seeded from `new Date()` once and then only ever changed by the
   * user, so an app left open (or merely backgrounded) past midnight kept
   * showing yesterday — the old weekday in the header, the old ring on the
   * week strip, and no "now" badge anywhere, because `isToday` was false for
   * the day being displayed.
   *
   * It only follows when the user was actually ON today. Someone who has paged
   * forward to plan Thursday should stay on Thursday, not be yanked back at
   * midnight — moving the ground under a deliberate navigation is worse than
   * the staleness this fixes.
   */
  const todayKey = useToday();
  const wasToday = useRef(todayKey);
  useEffect(() => {
    const previous = wasToday.current;
    wasToday.current = todayKey;
    if (previous === todayKey) return;
    setDate((d) => (dateKey(d) === previous ? parseKey(todayKey) : d));
  }, [todayKey]);
  const dayTasks = useMemo(() => tasksForDate(tasks, key), [tasks, key]);
  const doneCount = dayTasks.filter((t) => t.done).length;

  /** Only ever one row is "now", and only on today. */
  const nowTaskId = useMemo(() => {
    if (!isToday(key)) return null;
    const hit = dayTasks.find(
      (t) => !t.done && t.startMinutes != null && now >= t.startMinutes && now < t.startMinutes + t.minutes
    );
    return hit?.id ?? null;
  }, [dayTasks, key, now]);

  /**
   * WORK THAT DID NOT HAPPEN, WHICH USED TO JUST VANISH.
   *
   * An activity is filed under one date and Today renders exactly that date, so
   * anything left unticked when the clock passed midnight fell out of the app
   * entirely: still stored, still counted in "Activities", and reachable only
   * by someone who thought to page backwards through the week looking for it.
   * For a planner aimed at people who lose track of things, quietly losing
   * track of things is the worst available failure.
   *
   * Only on today, because "overdue" is meaningless while you are looking at a
   * past day (everything there is) or a future one (nothing is yet). Routines
   * are excluded: today already has its own copy, so yesterday's leftover
   * morning is not outstanding work, it is yesterday's record.
   */
  const overdue = useMemo(() => {
    if (!isToday(key)) return [];
    return tasks
      .filter((t) => t.date != null && t.date < key && !t.done && !isRoutineTask(t.id))
      .sort((a, b) => (a.date! < b.date! ? -1 : a.date! > b.date! ? 1 : 0));
  }, [tasks, key]);

  const [overdueOpen, setOverdueOpen] = useState(false);

  /**
   * Whether the group is on screen, which is not the same as whether there is
   * anything overdue. After "Not today" the work is still outstanding — the
   * day options menu still counts it and offers it back — it is just no longer
   * being put in front of someone who has already answered.
   */
  const offerOverdue = overdue.length > 0 && carryOverDeclinedOn !== key;

  const rows = useMemo<Row[]>(() => {
    const out: Row[] = [];
    if (offerOverdue) {
      out.push({ kind: 'overdue', count: overdue.length });
      if (overdueOpen) for (const t of overdue) out.push({ kind: 'overdueTask', task: t });
    }
    for (const slot of SLOT_ORDER) {
      const inSlot = bySlot(dayTasks, slot);
      // An empty Anytime bucket is still shown — it is the drop target that
      // teaches people the bucket exists. The other slots hide when empty.
      if (inSlot.length === 0 && slot !== 'anytime') continue;
      out.push({ kind: 'section', slot, count: inSlot.length });
      if (collapsed[slot]) continue;
      if (inSlot.length === 0) out.push({ kind: 'empty', slot });
      else for (const t of inSlot) out.push({ kind: 'task', task: t, isNow: t.id === nowTaskId });
    }
    return out;
  }, [dayTasks, collapsed, nowTaskId, overdue, offerOverdue, overdueOpen]);

  /**
   * Which time-of-day blocks are finished.
   *
   * `length > 0` is load-bearing: `every()` is vacuously true on an empty
   * array, so without it a slot with nothing in it would report itself
   * complete on every render forever.
   */
  const slotsComplete = useMemo(() => {
    const out = { morning: false, afternoon: false, evening: false };
    for (const slot of ['morning', 'afternoon', 'evening'] as const) {
      const inSlot = bySlot(dayTasks, slot);
      out[slot] = inSlot.length > 0 && inSlot.every((t) => t.done);
    }
    return out;
  }, [dayTasks]);

  const { celebrating, dismiss } = useSlotCompletion(key, slotsComplete);

  /**
   * A day with nothing in it renders no list, so there is nothing left that
   * could scroll the chrome back into place. Paging from a scrolled day to an
   * empty one — which is most days — otherwise leaves the blurred scroll edge
   * at full strength over a screen with nothing under it, because a date change
   * is not a navigation focus change and nothing else fires.
   */
  /**
   * OUTSTANDING WORK MEANS THE DAY IS NOT EMPTY.
   *
   * The empty branch renders no list, which left the overdue group unable to
   * expand on exactly the day its contents matter most: the banner could say
   * "6 unfinished from earlier days" and offer to move all six, with no way to
   * see what they were. Falling through to the list gives the group its
   * chevron, its rows and the Anytime drop target — and the sleeping dog is
   * the right picture for a day with nothing on it, not for a day with six
   * things waiting.
   *
   * Once they have been declined for today, though, the day IS empty as far as
   * today is concerned, and the sleeping dog is the right picture again.
   */
  const empty = dayTasks.length === 0 && !offerOverdue;
  useEffect(() => { if (empty) resetChrome(); }, [empty, resetChrome]);

  /**
   * MOVING EVERYTHING FORWARD ASKS FIRST.
   *
   * The button relocates an unbounded set — someone three months in can be
   * carrying forty abandoned activities — and there is no undo short of
   * opening forty detail screens. Naming the count before doing it is the
   * difference between an action and an accident, and Tiimo's own review puts
   * the number on the button for the same reason.
   */
  const confirmCarryOver = useCallback((count: number) => {
    haptic.warn();
    const go = () => { haptic.success(); carryOver(key); setOverdueOpen(false); };
    const title = t('today.moveAllTitle', { count });
    const body = t('today.moveAllBody');
    if (process.env.EXPO_OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: [t('today.moveToToday'), t('common.cancel')],
          cancelButtonIndex: 1,
          title,
          message: body,
          userInterfaceStyle: isDark ? 'dark' : 'light',
        },
        (i) => { if (i === 0) go(); }
      );
    } else {
      Alert.alert(title, body, [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('today.moveToToday'), onPress: go },
      ]);
    }
  }, [carryOver, key, t, isDark]);

  /**
   * DECLINING ASKS NOTHING, because it changes nothing: every activity stays
   * on its own day. A confirmation in front of a no-op would make saying no
   * cost more than saying yes, which is the imbalance this button exists to
   * remove. It is undone from the day options menu rather than a toast — the
   * app has no toast, and the menu is where the rest of "how this day is
   * shown" already lives.
   */
  const declineOverdue = useCallback(() => {
    haptic.tick();
    declineCarryOver(key);
    setOverdueOpen(false);
    // The button just took itself off screen, so VoiceOver's focus has
    // nowhere to land. Saying what happened is the only feedback a screen
    // reader user would otherwise get, and it names the way back.
    AccessibilityInfo.announceForAccessibility(t('today.notTodayDone'));
  }, [declineCarryOver, key, t]);

  /** Declined today, and there is still something to show — the menu's cue. */
  const canReoffer = overdue.length > 0 && !offerOverdue;

  const openMenu = useCallback(() => {
    /**
     * A LIST OF ACTIONS, NOT FIXED INDICES, because the last one comes and
     * goes: "Show unfinished" is only there after a "Not today". Matching the
     * sheet's tap back to hard-coded positions would silently run the wrong
     * action the day an option is added in front of it.
     */
    const actions: { label: string; run: () => void }[] = [
      { label: t('today.compactLayout'), run: () => setLayout('compact') },
      { label: t('today.timelineLayout'), run: () => setLayout('timeline') },
    ];
    if (canReoffer) {
      actions.push({
        label: t('today.showUnfinished', { count: overdue.length }),
        // Opened, not just restored: someone who asked to SEE them should
        // not have to find the chevron as well.
        run: () => { reofferCarryOver(); setOverdueOpen(true); },
      });
    }
    if (process.env.EXPO_OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: [...actions.map((a) => a.label), t('common.cancel')],
          cancelButtonIndex: actions.length,
          title: t('today.dayOptions'),
          userInterfaceStyle: isDark ? 'dark' : 'light',
        },
        (i) => {
          const action = actions[i];
          if (action) { haptic.tick(); action.run(); }
        }
      );
    } else {
      /**
       * Android's alert shows AT MOST THREE buttons and drops the rest without
       * a word. With the fourth option present, Cancel is the one to lose:
       * the dialog is made dismissable by tapping outside it instead, which is
       * how Android users close a dialog anyway.
       */
      const buttons = [
        ...actions.map((a) => ({ text: a.label, onPress: a.run })),
        { text: t('common.cancel'), style: 'cancel' as const },
      ].slice(0, 3);
      Alert.alert(t('today.dayOptions'), undefined, buttons, { cancelable: true });
    }
  }, [setLayout, isDark, t, canReoffer, overdue.length, reofferCarryOver]);

  const header = (
    <DayHeader
      date={date}
      onChangeDate={setDate}
      doneCount={doneCount}
      total={dayTasks.length}
      onAdd={() => router.push({ pathname: '/add', params: { date: key } })}
      onMenu={openMenu}
    />
  );

  if (empty) {
    return (
      <View style={{ flex: 1, backgroundColor: c.canvas, paddingHorizontal: space.lg, paddingTop: insets.top + space.sm }}>
        {header}
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.xl, paddingBottom: TAB_BAR_HEIGHT }}>
          {/* An empty day is the ONE screen in the app that is both frequent
              enough to matter and blank enough to afford an illustration. Pupu
              is asleep rather than waving: a day with nothing in it is not a
              failure to be cheered at, and a dozing dog says "nothing is
              happening yet" without implying you are behind. */}
          <View style={{ height: 176, alignItems: 'center', justifyContent: 'center' }}>
            <View style={{ position: 'absolute', opacity: 0.45 }}>
              <Bloom scale={0.72} />
            </View>
            <PupuScene pose="rest" size={150} idle="breathe" delay={80} />
          </View>
          <View style={{ alignItems: 'center', gap: space.sm, maxWidth: 270 }}>
            <Txt variant="displaySm" style={{ textAlign: 'center' }}>{t('today.emptyTitle')}</Txt>
            <Txt variant="body" tone="muted" style={{ textAlign: 'center' }}>
              {t('today.emptyBody')}
            </Txt>
          </View>
          <Button
            label={t('today.addActivity')}
            icon="plus"
            fullWidth={false}
            onPress={() => router.push({ pathname: '/add', params: { date: key } })}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.canvas }}>
      <FlashList
        data={rows}
        keyExtractor={(r) =>
          r.kind === 'task' || r.kind === 'overdueTask'
            ? r.task.id
            : r.kind === 'overdue'
              ? 'overdue'
              : `${r.kind}-${r.slot}`
        }
        getItemType={(r) => r.kind}
        /**
         * NO SCROLL ANCHORING, because the one thing ever inserted at the top
         * of this list is the thing the user is meant to see.
         *
         * FlashList v2 anchors on the first visible row by default and scrolls
         * to keep it still when rows are inserted above it — right for a chat,
         * wrong here. At the very top of the day that row is the Anytime
         * section, so the overdue group arriving above it (paging to today, or
         * "Show unfinished" from the menu) pushed the view down by the group's
         * own height: the group landed off-screen, above a header now half
         * under the status bar. A day's plan is short and replaced wholesale on
         * every page, so there is no position worth holding across a change.
         */
        maintainVisibleContentPosition={{ disabled: true }}
        ListHeaderComponent={<View style={{ paddingTop: insets.top + space.sm }}>{header}</View>}
        contentContainerStyle={{
          paddingHorizontal: space.lg,
          paddingBottom: TAB_BAR_HEIGHT + insets.bottom + space.xxl,
        }}
        showsVerticalScrollIndicator={false}
        {...scroll}
        renderItem={({ item }) => {
          if (item.kind === 'overdue') {
            return (
              <OverdueBanner
                count={item.count}
                open={overdueOpen}
                onToggle={() => { haptic.tick(); setOverdueOpen((o) => !o); }}
                onMoveAll={() => confirmCarryOver(item.count)}
                onDecline={declineOverdue}
              />
            );
          }
          if (item.kind === 'overdueTask') {
            return (
              <View style={{ paddingBottom: space.sm }}>
                <TaskRow
                  task={item.task}
                  onToggle={() => toggleTask(item.task.id)}
                  onToggleStep={(sid) => toggleStep(item.task.id, sid)}
                  onPress={() => router.push(`/task/${item.task.id}`)}
                />
              </View>
            );
          }
          if (item.kind === 'section') {
            return (
              <View style={{ paddingTop: space.lg, paddingBottom: space.sm }}>
                <SlotChip
                  slot={item.slot}
                  label={slotLabel(item.slot)}
                  count={item.count}
                  expanded={!collapsed[item.slot]}
                  onToggle={() => {
                    haptic.tick();
                    setCollapsed((p) => ({ ...p, [item.slot]: !p[item.slot] }));
                  }}
                />
              </View>
            );
          }
          if (item.kind === 'empty') {
            return (
              <SlotEmpty
                hint={t('today.anytimeHint')}
                onPress={() => router.push({ pathname: '/add', params: { date: key, slot: item.slot } })}
              />
            );
          }
          // Named `task`, not `t` — `t` is the translator in this scope now.
          const task = item.task;
          return (
            <View style={{ paddingBottom: space.sm }}>
              <TaskRow
                task={task}
                isNow={item.isNow}
                showTime={layout === 'timeline'}
                onToggle={() => toggleTask(task.id)}
                onToggleStep={(sid) => toggleStep(task.id, sid)}
                onPress={() => router.push(`/task/${task.id}`)}
                onStartFocus={() => router.push({ pathname: '/(tabs)/focus', params: { taskId: task.id } })}
              />
            </View>
          );
        }}
      />

      {/* Pinned above the list, so the day passes UNDER it. */}
      <ScrollEdge title={weekdayLong(date)} subtitle={longDate(date)} />

      {/* Keyed on the slot so a second block finishing while the first is still
          on screen REPLACES it rather than being swallowed — without the key,
          React reuses the component and the entrance never replays. */}
      {celebrating ? (
        <SlotCelebration key={celebrating} slot={celebrating} onDone={dismiss} />
      ) : null}
    </View>
  );
}

/**
 * The overdue group, and the one gesture that clears it.
 *
 * ── IT STATES A FACT AND OFFERS ONE ACTION ─────────────────────────────────
 * Not a nag and not a score. The copy counts what is outstanding and the button
 * moves it to today; there is no "you missed 4 activities", because the reader
 * of this line is the person least helped by being told that. Tiimo's own
 * end-of-day review ("These are the remaining tasks. Anything you want to move
 * to another day?") sets the register, and Todoist's Overdue group sets the
 * shape: a collapsed header with a reschedule action, not a modal.
 *
 * COLLAPSED BY DEFAULT, because it sits above today's plan and the plan is what
 * the user came for. Opening it lists the activities as ordinary rows, so each
 * one can still be ticked, opened or deleted individually.
 *
 * ── AND IT TAKES NO FOR AN ANSWER ─────────────────────────────────────────
 * One action made the banner a question with a single permitted reply. Every
 * planner in the reference class that does this well lets the user decline:
 * Microsoft To Do only ever SUGGESTS yesterday's leftovers and forgets them if
 * you do not pick them; Sunsama's rollover can be switched to a prompt; Tiimo's
 * review asks "anything you want to move?", which has "no" as an answer.
 * "Not today" sits beside "Move to today" as a peer — same size, quieter fill —
 * because a decline that is harder to reach than the accept is not a choice.
 */
function OverdueBanner({
  count, open, onToggle, onMoveAll, onDecline,
}: {
  count: number;
  open: boolean;
  /** Absent on the empty-day branch, which has no list to expand INTO. */
  onToggle?: () => void;
  onMoveAll: () => void;
  onDecline: () => void;
}) {
  const { c } = useTheme();
  const { t } = useT();

  /**
   * TWO LINES, NOT ONE ROW.
   *
   * The first arrangement put the count and the button side by side, which fits
   * in English ("2 unfinished from earlier days" · "Move to today") and does not
   * fit in Vietnamese, where the same two strings are half again as long. A
   * count that truncates is a count nobody can read, and this line exists to be
   * read. Stacking costs one row of height on a banner that is usually absent.
   *
   * ── AND `PressScale` CANNOT CARRY THE LAYOUT ──────────────────────────────
   * It puts the style it is given on its INNER animated view, not on the
   * `Pressable` wrapping it, so a `flex: 1` handed to it lands a level too deep
   * and does nothing: the row collapsed to its icon and chevron with the label
   * squeezed to zero width. The summary is a plain `Pressable` for that reason.
   */
  const summary = (
    <>
      <Icon name="arrow.uturn.left" size={13} color={c.inkMuted} weight="semibold" />
      <Txt variant="captionStrong" tone="muted" style={{ flex: 1 }} numberOfLines={2}>
        {t('today.overdueCount', { count })}
      </Txt>
      {onToggle ? (
        <Icon
          name={open ? 'chevron.up' : 'chevron.down'}
          size={11}
          color={c.inkFaint}
          weight="bold"
        />
      ) : null}
    </>
  );

  const summaryStyle = {
    flexDirection: 'row' as const, alignItems: 'center' as const, gap: space.sm,
  };

  return (
    <View style={{ paddingTop: space.lg, paddingBottom: space.sm }}>
      <View
        style={{
          gap: space.md, padding: space.md,
          borderRadius: radius.card, borderCurve: 'continuous',
          backgroundColor: c.surfaceSunken,
        }}
      >
        {onToggle ? (
          <Pressable
            onPress={onToggle}
            accessibilityRole="button"
            accessibilityState={{ expanded: open }}
            accessibilityLabel={t('today.overdueCount', { count })}
            style={summaryStyle}
          >
            {summary}
          </Pressable>
        ) : (
          <View accessible accessibilityLabel={t('today.overdueCount', { count })} style={summaryStyle}>
            {summary}
          </View>
        )}

        {/* Wraps rather than truncates, for the same reason the summary above
            stacks: in Vietnamese the two labels together can outrun the card. */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
          <PressScale
            onPress={onMoveAll}
            accessibilityRole="button"
            accessibilityLabel={t('today.moveToToday')}
            style={{
              paddingVertical: 8, paddingHorizontal: space.base,
              borderRadius: radius.pill, backgroundColor: c.solid,
            }}
          >
            <Txt variant="micro" color={c.onSolid}>{t('today.moveToToday')}</Txt>
          </PressScale>
          <PressScale
            onPress={onDecline}
            accessibilityRole="button"
            accessibilityLabel={t('today.notToday')}
            accessibilityHint={t('today.notTodayHint')}
            style={{
              paddingVertical: 8, paddingHorizontal: space.base,
              borderRadius: radius.pill, backgroundColor: c.surface,
            }}
          >
            <Txt variant="micro" color={c.ink}>{t('today.notToday')}</Txt>
          </PressScale>
        </View>
      </View>
    </View>
  );
}
