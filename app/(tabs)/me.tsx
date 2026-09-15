import { useMemo } from 'react';
import { View, ScrollView, ActionSheetIOS, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Txt } from '../../src/components/Txt';
import { Bloom } from '../../src/components/Bloom';
import { PipScene } from '../../src/components/mascot/PipScene';
import { TAB_BAR_HEIGHT } from '../../src/components/TabBar';
import { Section, RowItem } from '../../src/components/Settings';
import { ScrollEdge } from '../../src/components/ScrollEdge';
import { useChromeScroll } from '../../src/components/Chrome';
import { useTheme } from '../../src/theme/useTheme';
import { radius, space } from '../../src/theme/tokens';
import { usePlanStore, routineSteps } from '../../src/store/usePlanStore';
import { ROUTINE_SLOTS } from '../../src/data/routines';
import { dateKey, formatDuration } from '../../src/lib/time';
import { haptic } from '../../src/lib/haptics';

const APPEARANCE_LABEL = {
  system: 'Follows system',
  light: 'Light',
  dark: 'Dark',
} as const;

export default function Me() {
  const insets = useSafeAreaInsets();
  const { c, isDark } = useTheme();
  const scroll = useChromeScroll();

  const tasks = usePlanStore((s) => s.tasks);
  const profile = usePlanStore((s) => s.profile);
  const layout = usePlanStore((s) => s.layout);
  const setLayout = usePlanStore((s) => s.setLayout);
  const resetOnboarding = usePlanStore((s) => s.resetOnboarding);

  /**
   * What the routines actually contain, read back.
   *
   * Counted through `routineSteps` rather than off `profile.routines` directly,
   * so a stored id with no step behind it — a catalogue entry retired by a
   * newer build — is not counted as something the user still has. The row
   * would otherwise promise "8 steps" and open a screen showing seven.
   */
  const routineSummary = useMemo(() => {
    const total = ROUTINE_SLOTS.reduce((n, slot) => n + routineSteps(profile, slot).length, 0);
    if (total === 0) return 'None set';
    const slots = ROUTINE_SLOTS.filter((slot) => routineSteps(profile, slot).length).length;
    return `${total} ${total === 1 ? 'step' : 'steps'} · ${slots} of 3`;
  }, [profile]);

  const remindersSummary = !profile.reminders
    ? 'Off'
    : profile.reminderLead === 0
      ? 'As things start'
      : `${formatDuration(profile.reminderLead)} before`;

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
        {
          options: ['Compact', 'Timeline', 'Cancel'],
          cancelButtonIndex: 2,
          title: 'Day layout',
          userInterfaceStyle: isDark ? 'dark' : 'light',
        },
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
          title: 'Run onboarding again?',
          message: 'Your activities, appearance and reminder settings are kept.',
          userInterfaceStyle: isDark ? 'dark' : 'light',
        },
        (i) => { if (i === 0) go(); }
      );
    } else {
      Alert.alert('Run onboarding again?', 'Your activities, appearance and reminder settings are kept.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Start over', style: 'destructive', onPress: go },
      ]);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.canvas }}>
      <ScrollView
        {...scroll}
        contentInsetAdjustmentBehavior="never"
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
          {/* Both of these used to be dead ends: Routines showed a count and
              could not be opened, and Reminders was a bare switch with nothing
              behind it. They are screens now. */}
          <RowItem
            icon="repeat"
            label="Routines"
            value={routineSummary}
            onPress={() => router.push('/routines')}
          />
          <RowItem
            icon="bell"
            label="Reminders"
            value={remindersSummary}
            onPress={() => router.push('/settings/reminders')}
          />
        </Section>

        <Section title="About">
          <RowItem
            icon="paintpalette"
            label="Appearance"
            value={APPEARANCE_LABEL[profile.appearance] ?? 'Follows system'}
            onPress={() => router.push('/settings/appearance')}
          />
          <RowItem icon="lock" label="Your data" value="On this device" />
          <RowItem icon="arrow.counterclockwise" label="Run onboarding again" onPress={startOver} />
        </Section>

        <Txt variant="caption" tone="faint" style={{ textAlign: 'center' }}>
          Oneplan 1.0
        </Txt>
      </ScrollView>

      <ScrollEdge title="Me" />
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
