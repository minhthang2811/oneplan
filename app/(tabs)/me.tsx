import { useMemo } from 'react';
import { View, ScrollView, Switch, Pressable, ActionSheetIOS, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Txt } from '../../src/components/Txt';
import { Icon } from '../../src/components/Icon';
import { Bloom } from '../../src/components/Bloom';
import { PipScene } from '../../src/components/mascot/PipScene';
import { TAB_BAR_HEIGHT } from '../../src/components/TabBar';
import { useTheme } from '../../src/theme/useTheme';
import { radius, space } from '../../src/theme/tokens';
import { usePlanStore } from '../../src/store/usePlanStore';
import { dateKey, formatDuration } from '../../src/lib/time';
import { haptic } from '../../src/lib/haptics';
import type { SymbolViewProps } from 'expo-symbols';

export default function Me() {
  const insets = useSafeAreaInsets();
  const { c } = useTheme();
  const tasks = usePlanStore((s) => s.tasks);
  const profile = usePlanStore((s) => s.profile);
  const layout = usePlanStore((s) => s.layout);
  const setLayout = usePlanStore((s) => s.setLayout);
  const resetOnboarding = usePlanStore((s) => s.resetOnboarding);

  /**
   * What onboarding picked, read back. Without this the routine choice becomes
   * invisible the moment the tasks it created are edited, and there is nowhere
   * to check what the plan thinks your day looks like.
   */
  const routineSummary = useMemo(() => {
    const r = profile.routines;
    const parts = ([ 'morning', 'afternoon', 'evening' ] as const).filter((k) => r[k]?.length);
    const total = parts.reduce((n, k) => n + r[k].length, 0);
    if (total === 0) return 'None set';
    return `${total} picked`;
  }, [profile.routines]);

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
          {/* The closest thing this app has to a profile picture. Me is visited
              occasionally rather than constantly, which is the tier that can
              carry a breathing idle — and the mascot in front of the brand mark
              is the same composition as the welcome screen, so the app opens and
              settles on the same image. */}
          <View style={{ height: 140, alignItems: 'center', justifyContent: 'center' }}>
            <View style={{ position: 'absolute', opacity: 0.5 }}>
              <Bloom scale={0.62} />
            </View>
            <PipScene pose="sit" size={124} idle="breathe" />
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
          <RowItem icon="repeat" label="Routines" value={routineSummary} />
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
      {/* The label keeps priority on space and the value gives way. Without
          `flexShrink` on the value, a long one takes its full natural width and
          squeezes the label to nothing — at large Dynamic Type sizes the label
          then wraps to ONE CHARACTER PER LINE rather than truncating. */}
      <Txt variant="body" style={{ flex: 1 }} numberOfLines={2}>{label}</Txt>
      {value ? (
        <Txt
          variant="body"
          tone="muted"
          numberOfLines={1}
          style={{ flexShrink: 1, textAlign: 'right' }}
        >
          {value}
        </Txt>
      ) : null}
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
