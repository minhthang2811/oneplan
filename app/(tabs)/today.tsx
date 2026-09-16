import { useEffect, useMemo, useState, useCallback } from 'react';
import { View, ActionSheetIOS, Alert } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Txt } from '../../src/components/Txt';
import { TaskRow } from '../../src/components/TaskRow';
import { SlotChip, SlotEmpty } from '../../src/components/SlotChip';
import { DayHeader } from '../../src/components/DayHeader';
import { Bloom } from '../../src/components/Bloom';
import { PipScene } from '../../src/components/mascot/PipScene';
import { Button } from '../../src/components/Button';
import { TAB_BAR_HEIGHT } from '../../src/components/TabBar';
import { ScrollEdge } from '../../src/components/ScrollEdge';
import { useChromeScroll, useChromeReset } from '../../src/components/Chrome';
import { SlotCelebration, useSlotCompletion } from '../../src/components/SlotCelebration';
import { useTheme } from '../../src/theme/useTheme';
import { space } from '../../src/theme/tokens';
import { useT } from '../../src/i18n';
import { usePlanStore, tasksForDate, bySlot } from '../../src/store/usePlanStore';
import { dateKey, isToday, weekdayLong, longDate, SLOT_ORDER, slotLabel, type Slot } from '../../src/lib/time';
import { useNowMinutes } from '../../src/lib/useNowMinutes';
import { haptic } from '../../src/lib/haptics';
import type { Task } from '../../src/store/types';

type Row =
  | { kind: 'section'; slot: Slot; count: number }
  | { kind: 'task'; task: Task; isNow: boolean }
  | { kind: 'empty'; slot: Slot };

export default function Today() {
  const [date, setDate] = useState(() => new Date());
  const [collapsed, setCollapsed] = useState<Partial<Record<Slot, boolean>>>({});
  const insets = useSafeAreaInsets();
  const { c, isDark } = useTheme();
  const { t } = useT();
  const scroll = useChromeScroll();
  const resetChrome = useChromeReset();

  const tasks = usePlanStore((s) => s.tasks);
  const layout = usePlanStore((s) => s.layout);
  const toggleTask = usePlanStore((s) => s.toggleTask);
  const toggleStep = usePlanStore((s) => s.toggleStep);
  const setLayout = usePlanStore((s) => s.setLayout);

  const key = dateKey(date);
  // Live clock: "now" depends on time passing, not on the task list changing.
  const now = useNowMinutes();
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

  const rows = useMemo<Row[]>(() => {
    const out: Row[] = [];
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
  }, [dayTasks, collapsed, nowTaskId]);

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
   * empty one — which is most days — otherwise left the tab bar contracted
   * with no way to restore it, because a date change is not a navigation
   * focus change and nothing else fires.
   */
  const empty = dayTasks.length === 0;
  useEffect(() => { if (empty) resetChrome(); }, [empty, resetChrome]);

  const openMenu = useCallback(() => {
    const options = [t('today.compactLayout'), t('today.timelineLayout'), t('common.cancel')];
    if (process.env.EXPO_OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex: 2,
          title: t('today.dayOptions'),
          userInterfaceStyle: isDark ? 'dark' : 'light',
        },
        (i) => {
          if (i === 0) { haptic.tick(); setLayout('compact'); }
          if (i === 1) { haptic.tick(); setLayout('timeline'); }
        }
      );
    } else {
      Alert.alert(t('today.dayOptions'), undefined, [
        { text: t('today.compactLayout'), onPress: () => setLayout('compact') },
        { text: t('today.timelineLayout'), onPress: () => setLayout('timeline') },
        { text: t('common.cancel'), style: 'cancel' },
      ]);
    }
  }, [setLayout, isDark, t]);

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
              enough to matter and blank enough to afford an illustration. Pip
              is asleep rather than waving: a day with nothing in it is not a
              failure to be cheered at, and a dozing dog says "nothing is
              happening yet" without implying you are behind. */}
          <View style={{ height: 176, alignItems: 'center', justifyContent: 'center' }}>
            <View style={{ position: 'absolute', opacity: 0.45 }}>
              <Bloom scale={0.72} />
            </View>
            <PipScene pose="rest" size={150} idle="breathe" delay={80} />
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
          r.kind === 'task' ? r.task.id : `${r.kind}-${r.slot}`
        }
        getItemType={(r) => r.kind}
        ListHeaderComponent={<View style={{ paddingTop: insets.top + space.sm }}>{header}</View>}
        contentContainerStyle={{
          paddingHorizontal: space.lg,
          paddingBottom: TAB_BAR_HEIGHT + insets.bottom + space.xxl,
        }}
        showsVerticalScrollIndicator={false}
        {...scroll}
        renderItem={({ item }) => {
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
