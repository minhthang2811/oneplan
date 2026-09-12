import { useMemo } from 'react';
import { View, ScrollView, Switch, Pressable, ActionSheetIOS, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Txt } from '../../src/components/Txt';
import { Icon } from '../../src/components/Icon';
import { Bloom } from '../../src/components/Bloom';
import { TAB_BAR_HEIGHT } from '../../src/components/TabBar';
import { useTheme } from '../../src/theme/useTheme';
import { radius, space } from '../../src/theme/tokens';
import { usePlanStore } from '../../src/store/usePlanStore';
import { dateKey, formatDuration } from '../../src/lib/time';
import { haptic } from '../../src/lib/haptics';
import type { SymbolViewProps } from 'expo-symbols';

export default function Me() {
  const insets = useSafeAreaInsets();
  const { c, shadow } = useTheme();
  const tasks = usePlanStore((s) => s.tasks);
  const profile = usePlanStore((s) => s.profile);
  const layout = usePlanStore((s) => s.layout);
  const setLayout = usePlanStore((s) => s.setLayout);
  const resetOnboarding = usePlanStore((s) => s.resetOnboarding);

  const stats = useMemo(() => {
    const today = dateKey(new Date());
    const todays = tasks.filter((t) => t.date === today);
    const done = todays.filter((t) => t.done);
    const planned = todays.reduce((n, t) => n + t.minutes, 0);
    return { done: done.length, total: todays.length, planned };
  }, [tasks]);

  const pickLayout = () => {
    haptic.tap();
    if (process.env.EXPO_OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: ['Compact', 'Timeline', 'Cancel'], cancelButtonIndex: 2, title: 'Day layout' },
        (i) => { if (i === 0) setLayout('compact'); if (i === 1) setLayout('timeline'); }
      );
    } else {
      Alert.alert('Day layout', undefined, [
        { text: 'Compact', onPress: () => setLayout('compact') },
        { text: 'Timeline', onPress: () => setLayout('timeline') },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  };

  const startOver = () => {
    const go = () => { resetOnboarding(); router.replace('/onboarding/welcome'); };
    if (process.env.EXPO_OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Start over', 'Cancel'], destructiveButtonIndex: 0, cancelButtonIndex: 1,
          title: 'Run onboarding again?', message: 'Your activities are kept.',
        },
        (i) => { if (i === 0) go(); }
      );
    } else {
      Alert.alert('Run onboarding again?', 'Your activities are kept.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Start over', style: 'destructive', onPress: go },
      ]);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.canvas }}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: space.lg,
          paddingTop: insets.top + space.sm,
          paddingBottom: TAB_BAR_HEIGHT + insets.bottom + space.xxl,
          gap: space.xl,
        }}
      >
        <View style={{ alignItems: 'center', gap: space.md }}>
          <View style={{ height: 130, justifyContent: 'center' }}>
            <Bloom scale={0.56} />
          </View>
          <Txt variant="displayLg">Me</Txt>
          {profile.need ? (
            <Txt variant="caption" tone="muted" style={{ textAlign: 'center' }}>
              Here to {profile.need.toLowerCase()}
            </Txt>
          ) : null}
        </View>

        <View style={{ flexDirection: 'row', gap: space.md }}>
          <Stat label="Done today" value={`${stats.done}`} sub={`of ${stats.total}`} />
          <Stat label="Planned" value={formatDuration(stats.planned)} sub="today" />
          <Stat label="Activities" value={`${tasks.length}`} sub="total" />
        </View>

        <Section title="Planning">
          <RowItem
            icon="rectangle.3.group"
            label="Day layout"
            value={layout === 'compact' ? 'Compact' : 'Timeline'}
            onPress={pickLayout}
          />
          <RowItem
            icon="bell"
            label="Reminders"
            trailing={
              <Switch
                value={profile.reminders}
                onValueChange={(v) => {
                  haptic.tick();
                  usePlanStore.setState((s) => ({ profile: { ...s.profile, reminders: v } }));
                }}
              />
            }
          />
        </Section>

        <Section title="About">
          <RowItem icon="paintpalette" label="Appearance" value="Follows system" />
          <RowItem icon="lock" label="Your data" value="On this device" />
          <RowItem icon="arrow.counterclockwise" label="Run onboarding again" onPress={startOver} />
        </Section>

        <Txt variant="caption" tone="faint" style={{ textAlign: 'center' }}>
          Oneplan 1.0
        </Txt>
      </ScrollView>
    </View>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  const { c, shadow } = useTheme();
  return (
    <View
      style={{
        flex: 1, gap: 2, padding: space.md,
        borderRadius: radius.card, borderCurve: 'continuous', backgroundColor: c.surface, boxShadow: shadow[1],
      }}
    >
      <Txt variant="micro" tone="faint" numberOfLines={1}>{label.toUpperCase()}</Txt>
      <Txt variant="displaySm" tabular>{value}</Txt>
      <Txt variant="caption" tone="muted">{sub}</Txt>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const { c, shadow } = useTheme();
  return (
    <View style={{ gap: space.sm }}>
      <Txt variant="micro" tone="faint">{title.toUpperCase()}</Txt>
      <View style={{ borderRadius: radius.card, borderCurve: 'continuous', backgroundColor: c.surface, boxShadow: shadow[1], overflow: 'hidden' }}>
        {children}
      </View>
    </View>
  );
}

function RowItem({
  icon, label, value, onPress, trailing,
}: {
  icon: SymbolViewProps['name'];
  label: string;
  value?: string;
  onPress?: () => void;
  trailing?: React.ReactNode;
}) {
  const { c } = useTheme();
  const body = (
    <View
      style={{
        flexDirection: 'row', alignItems: 'center', gap: space.md,
        paddingHorizontal: space.base, paddingVertical: 14, minHeight: 54,
      }}
    >
      <Icon name={icon} size={17} color={c.inkMuted} />
      <Txt variant="body" style={{ flex: 1 }}>{label}</Txt>
      {value ? <Txt variant="body" tone="muted">{value}</Txt> : null}
      {trailing}
      {onPress ? <Icon name="chevron.right" size={12} color={c.inkFaint} weight="semibold" /> : null}
    </View>
  );
  if (!onPress) return body;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label}>
      {body}
    </Pressable>
  );
}
