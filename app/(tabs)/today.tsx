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
import { PipScene } from '../../src/components/mascot/PipScene';
import { Button } from '../../src/components/Button';
import { TAB_BAR_HEIGHT } from '../../src/components/TabBar';
import { ScrollEdge, ScrollEdgeTitle, useScrollEdge } from '../../src/components/ScrollEdge';
import { useTheme } from '../../src/theme/useTheme';
import { space } from '../../src/theme/tokens';
import { useT } from '../../src/i18n';
import { usePlanStore, tasksForDate, bySlot } from '../../src/store/usePlanStore';
import { dateKey, isToday, weekdayLong, SLOT_ORDER, slotLabel, type Slot } from '../../src/lib/time';
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

  /** Drives the blurred top edge. See `ScrollEdge`. */
  const { edge, scrollProps } = useScrollEdge();

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

  if (dayTasks.length === 0) {
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
        {...scrollProps}
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

      {/* AFTER the list, never before: a BlurView mounted ahead of the dynamic
          content it blurs does not refresh (documented in expo-blur), and the
          edge would freeze on whatever happened to be there at mount. */}
      <ScrollEdge edge={edge}>
        <ScrollEdgeTitle edge={edge} title={weekdayLong(date)} />
      </ScrollEdge>
    </View>
  );
}
