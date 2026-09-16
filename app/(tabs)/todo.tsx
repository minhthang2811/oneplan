import { useMemo, useRef, useState } from 'react';
import { View, TextInput } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Txt } from '../../src/components/Txt';
import { Icon } from '../../src/components/Icon';
import { TaskRow } from '../../src/components/TaskRow';
import { CircleButton } from '../../src/components/DayHeader';
import { RingValue } from '../../src/components/Ring';
import { PressScale } from '../../src/components/Press';
import { TAB_BAR_HEIGHT } from '../../src/components/TabBar';
import { ScrollEdge, ScrollEdgeTitle, useScrollEdge } from '../../src/components/ScrollEdge';
import { useTheme } from '../../src/theme/useTheme';
import { radius, space, TINTS } from '../../src/theme/tokens';
import { useT, type TKey } from '../../src/i18n';
import { usePlanStore, inboxTasks } from '../../src/store/usePlanStore';
import { haptic } from '../../src/lib/haptics';
import type { Priority, Task } from '../../src/store/types';
import type { SymbolViewProps } from 'expo-symbols';

const BUCKETS: Array<{
  key: Priority; label: TKey; hint: TKey;
  tint: keyof typeof TINTS; icon: SymbolViewProps['name'];
}> = [
  { key: 'high',   label: 'todo.high',   hint: 'todo.hintHigh',   tint: 'rose',  icon: 'triangle.fill' },
  { key: 'medium', label: 'todo.medium', hint: 'todo.hintMedium', tint: 'peach', icon: 'circle.fill' },
  { key: 'low',    label: 'todo.low',    hint: 'todo.hintLow',    tint: 'sky',   icon: 'arrowtriangle.down.fill' },
  { key: 'todo',   label: 'todo.plain',  hint: 'todo.hintPlain',  tint: 'stone', icon: 'list.bullet' },
];

type Row =
  | { kind: 'bucket'; bucket: (typeof BUCKETS)[number]; count: number }
  | { kind: 'compose'; bucket: (typeof BUCKETS)[number] }
  | { kind: 'task'; task: Task };

export default function Todo() {
  const insets = useSafeAreaInsets();
  const { c, isDark } = useTheme();
  const { t } = useT();
  const { edge, scrollProps } = useScrollEdge();
  const tasks = usePlanStore((s) => s.tasks);
  const addTask = usePlanStore((s) => s.addTask);
  const toggleTask = usePlanStore((s) => s.toggleTask);
  const toggleStep = usePlanStore((s) => s.toggleStep);

  const inbox = useMemo(() => inboxTasks(tasks), [tasks]);
  const doneCount = inbox.filter((t) => t.done).length;

  const rows = useMemo<Row[]>(() => {
    const out: Row[] = [];
    for (const b of BUCKETS) {
      const items = inbox.filter((t) => t.priority === b.key);
      out.push({ kind: 'bucket', bucket: b, count: items.length });
      for (const t of items) out.push({ kind: 'task', task: t });
      out.push({ kind: 'compose', bucket: b });
    }
    return out;
  }, [inbox]);

  return (
    <View style={{ flex: 1, backgroundColor: c.canvas }}>
      <FlashList
        {...scrollProps}
        data={rows}
        keyExtractor={(r) => (r.kind === 'task' ? r.task.id : `${r.kind}-${r.bucket.key}`)}
        getItemType={(r) => r.kind}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: space.lg,
          paddingBottom: TAB_BAR_HEIGHT + insets.bottom + space.xxl,
        }}
        ListHeaderComponent={
          <View style={{ paddingTop: insets.top + space.sm, gap: space.base, paddingBottom: space.sm }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: space.sm,
                  paddingVertical: 7, paddingLeft: space.md, paddingRight: 14,
                  borderRadius: radius.pill, backgroundColor: c.surface,
                }}
              >
                <RingValue
                  size={16} strokeWidth={3}
                  value={inbox.length ? doneCount / inbox.length : 0}
                  color={c.accent} track={c.hairline}
                />
                <Txt variant="captionStrong" tabular>{doneCount}/{inbox.length}</Txt>
              </View>
              <CircleButton
                icon="plus"
                label={t('todo.addTodo')}
                onPress={() => router.push({ pathname: '/add', params: { inbox: '1' } })}
              />
            </View>
            <Txt variant="displayLg" style={{ textAlign: 'center' }}>{t('todo.title')}</Txt>
          </View>
        }
        renderItem={({ item }) => {
          if (item.kind === 'bucket') {
            const tint = TINTS[item.bucket.tint][isDark ? 'dark' : 'light'];
            return (
              <View style={{ paddingTop: space.lg, paddingBottom: space.sm }}>
                <View
                  style={{
                    flexDirection: 'row', alignItems: 'center', gap: space.sm,
                    alignSelf: 'flex-start', paddingVertical: 7, paddingHorizontal: space.md,
                    borderRadius: radius.pill, backgroundColor: tint.bg,
                  }}
                >
                  <Icon name={item.bucket.icon} size={10} color={tint.fg} weight="bold" />
                  <Txt variant="micro" color={tint.fg}>
                    {t(item.bucket.label).toUpperCase()}{item.count ? ` (${item.count})` : ''}
                  </Txt>
                </View>
              </View>
            );
          }
          if (item.kind === 'compose') {
            return <Compose hint={t(item.bucket.hint)} onSubmit={(title) => {
              addTask({ title, date: null, priority: item.bucket.key, minutes: 15, tint: item.bucket.tint === 'stone' ? 'lilac' : item.bucket.tint });
              haptic.success();
            }} />;
          }
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
        }}
      />

      {/* After the list — see the note in `ScrollEdge`. */}
      <ScrollEdge edge={edge}>
        <ScrollEdgeTitle edge={edge} title={t('todo.title')} />
      </ScrollEdge>
    </View>
  );
}

/**
 * Uncontrolled input: a controlled TextInput round-trips every keystroke
 * through JS and is a top cause of typing jank.
 *
 * The authoritative value lives in a ref, NOT in state. React state lags the
 * native input by a render, so committing from state truncates what a fast
 * typist just wrote ("Call the bank" saved as "Call the"). The ref is written
 * synchronously in onChangeText, and submit prefers the value the event
 * itself carries.
 */
function Compose({ hint, onSubmit }: { hint: string; onSubmit: (title: string) => void }) {
  const { c } = useTheme();
  const { t } = useT();
  const valueRef = useRef('');
  // Remounting the input is the only reliable way to empty an uncontrolled
  // field here: `.clear()` is issued against an instance that the list's
  // re-render has already replaced, so the committed text stays on screen and
  // the next entry appends to it.
  const [resetKey, setResetKey] = useState(0);

  const commit = (text?: string) => {
    const v = (text ?? valueRef.current).trim();
    if (!v) return;
    valueRef.current = '';
    setResetKey((k) => k + 1);
    onSubmit(v);
  };

  return (
    <View
      style={{
        flexDirection: 'row', alignItems: 'center', gap: space.sm,
        borderRadius: radius.card, borderCurve: 'continuous',
        borderWidth: 1.5, borderStyle: 'dashed',
        borderColor: c.hairline, paddingHorizontal: space.base, marginBottom: space.sm,
        minHeight: 48,
      }}
    >
      <TextInput
        key={resetKey}
        onChangeText={(t) => { valueRef.current = t; }}
        onSubmitEditing={(e) => commit(e.nativeEvent.text)}
        placeholder={hint}
        placeholderTextColor={c.inkFaint}
        returnKeyType="done"
        submitBehavior="submit"
        style={{
          flex: 1, color: c.ink, paddingVertical: space.md,
          fontFamily: 'Inter_400Regular', fontSize: 15,
        }}
      />
      <PressScale
        onPress={() => commit()}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={t('common.add')}
        style={{ padding: 6 }}
      >
        <Icon name="plus" size={15} color={c.inkFaint} weight="semibold" />
      </PressScale>
    </View>
  );
}
