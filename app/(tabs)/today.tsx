import { useMemo, useState, useCallback } from 'react';
import { View, ActionSheetIOS, Alert } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Txt } from '../../src/components/Txt';
import { TaskRow } from '../../src/components/TaskRow';
import { SlotChip, SlotEmpty } from '../../src/components/SlotChip';
import { DayHeader } from '../../src/components/DayHeader';
import { Bloom } from '../../src/components/Bloom';
import { Button } from '../../src/components/Button';
import { TAB_BAR_HEIGHT } from '../../src/components/TabBar';
import { useTheme } from '../../src/theme/useTheme';
import { space } from '../../src/theme/tokens';
import { usePlanStore, tasksForDate, bySlot } from '../../src/store/usePlanStore';
import { dateKey, isToday, SLOT_ORDER, SLOT_LABEL, type Slot } from '../../src/lib/time';
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

  const openMenu = useCallback(() => {
    const options = ['Compact layout', 'Timeline layout', 'Cancel'];
    if (process.env.EXPO_OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex: 2,
          title: 'Day options',
          userInterfaceStyle: isDark ? 'dark' : 'light',
        },
        (i) => {
          if (i === 0) { haptic.tick(); setLayout('compact'); }
          if (i === 1) { haptic.tick(); setLayout('timeline'); }
        }
      );
    } else {
      Alert.alert('Day options', undefined, [
        { text: 'Compact layout', onPress: () => setLayout('compact') },
        { text: 'Timeline layout', onPress: () => setLayout('timeline') },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  }, [setLayout, isDark]);

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

  if (dayTasks.length === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: c.canvas, paddingHorizontal: space.lg, paddingTop: insets.top + space.sm }}>
        {header}
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.xl, paddingBottom: TAB_BAR_HEIGHT }}>
          <Bloom scale={0.62} />
          <View style={{ alignItems: 'center', gap: space.sm, maxWidth: 270 }}>
            <Txt variant="displaySm" style={{ textAlign: 'center' }}>Nothing here yet</Txt>
            <Txt variant="body" tone="muted" style={{ textAlign: 'center' }}>
              Add one thing you want to get done. One is enough to start a day.
            </Txt>
          </View>
          <Button
            label="Add activity"
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
        renderItem={({ item }) => {
          if (item.kind === 'section') {
            return (
              <View style={{ paddingTop: space.lg, paddingBottom: space.sm }}>
                <SlotChip
                  slot={item.slot}
                  label={SLOT_LABEL[item.slot]}
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
                hint="Anything that works today"
                onPress={() => router.push({ pathname: '/add', params: { date: key, slot: item.slot } })}
              />
            );
          }
          const t = item.task;
          return (
            <View style={{ paddingBottom: space.sm }}>
              <TaskRow
                task={t}
                isNow={item.isNow}
                showTime={layout === 'timeline'}
                onToggle={() => toggleTask(t.id)}
                onToggleStep={(sid) => toggleStep(t.id, sid)}
                onPress={() => router.push(`/task/${t.id}`)}
                onStartFocus={() => router.push({ pathname: '/(tabs)/focus', params: { taskId: t.id } })}
              />
            </View>
          );
        }}
      />
    </View>
  );
}
