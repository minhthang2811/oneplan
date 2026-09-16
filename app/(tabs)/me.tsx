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
import { useT, useLanguageStore, hasKey, LOCALE_NAME, type TKey } from '../../src/i18n';
import { usePlanStore, routineSteps } from '../../src/store/usePlanStore';
import { ROUTINE_SLOTS } from '../../src/data/routines';
import { dateKey, formatDuration, formatDurationShort } from '../../src/lib/time';
import { haptic } from '../../src/lib/haptics';

const APPEARANCE_LABEL: Record<string, TKey> = {
  system: 'appearance.system',
  light: 'appearance.light',
  dark: 'appearance.dark',
};

export default function Me() {
  const insets = useSafeAreaInsets();
  const { c, isDark } = useTheme();
  const { t } = useT();
  const scroll = useChromeScroll();
  const language = useLanguageStore((s) => s.language);

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
    if (total === 0) return t('me.routinesNone');
    const slots = ROUTINE_SLOTS.filter((slot) => routineSteps(profile, slot).length).length;
    return t('me.routineSummary', { count: total, slots });
  }, [profile, t]);

  const remindersSummary = !profile.reminders
    ? t('me.remindersOff')
    : profile.reminderLead === 0
      ? t('me.remindersAsStart')
      : t('me.remindersBefore', { duration: formatDuration(profile.reminderLead) });

  /**
   * The onboarding answer, stored as a translation KEY so it follows a later
   * language change. Builds before that stored the English sentence itself, so
   * anything unrecognised is shown exactly as it was saved.
   */
  const needText = profile.need ? (hasKey(profile.need) ? t(profile.need) : profile.need) : null;

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
          options: [t('me.compact'), t('me.timeline'), t('common.cancel')],
          cancelButtonIndex: 2,
          title: t('me.dayLayout'),
          userInterfaceStyle: isDark ? 'dark' : 'light',
        },
        (i) => { if (i === 0) setLayout('compact'); if (i === 1) setLayout('timeline'); }
      );
    } else {
      Alert.alert(t('me.dayLayout'), undefined, [
        { text: t('me.compact'), onPress: () => setLayout('compact') },
        { text: t('me.timeline'), onPress: () => setLayout('timeline') },
        { text: t('common.cancel'), style: 'cancel' },
      ]);
    }
  };

  const startOver = () => {
    const go = () => { resetOnboarding(); router.replace('/onboarding/welcome'); };
    if (process.env.EXPO_OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: [t('me.startOver'), t('common.cancel')],
          destructiveButtonIndex: 0, cancelButtonIndex: 1,
          title: t('me.startOverTitle'),
          message: t('me.startOverBody'),
          userInterfaceStyle: isDark ? 'dark' : 'light',
        },
        (i) => { if (i === 0) go(); }
      );
    } else {
      Alert.alert(t('me.startOverTitle'), t('me.startOverBody'), [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('me.startOver'), style: 'destructive', onPress: go },
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
          <Txt variant="displayLg">{t('me.title')}</Txt>
          {needText ? (
            <Txt variant="caption" tone="muted" style={{ textAlign: 'center' }}>
              {t('me.hereTo', { need: needText.toLowerCase() })}
            </Txt>
          ) : null}
        </View>

        <View style={{ flexDirection: 'row', gap: space.md }}>
          <Stat
            label={t('me.doneToday')}
            value={`${stats.done}`}
            sub={t('me.ofTotal', { total: stats.total })}
          />
          <Stat
            label={t('me.planned')}
            value={formatDurationShort(stats.planned)}
            sub={t('me.todaySub')}
          />
          <Stat label={t('me.activities')} value={`${tasks.length}`} sub={t('me.totalSub')} />
        </View>

        <Section title={t('me.planning')}>
          <RowItem
            icon="rectangle.3.group"
            label={t('me.dayLayout')}
            value={layout === 'compact' ? t('me.compact') : t('me.timeline')}
            onPress={pickLayout}
          />
          {/* Both of these used to be dead ends: Routines showed a count and
              could not be opened, and Reminders was a bare switch with nothing
              behind it. They are screens now. */}
          <RowItem
            icon="repeat"
            label={t('me.routines')}
            value={routineSummary}
            onPress={() => router.push('/routines')}
          />
          <RowItem
            icon="bell"
            label={t('me.reminders')}
            value={remindersSummary}
            onPress={() => router.push('/settings/reminders')}
          />
        </Section>

        <Section title={t('me.about')}>
          {/* Language sits beside Appearance because they are the same KIND of
              setting: both default to following the phone, and both can be
              pinned. Showing "System" rather than the resolved language is what
              makes that distinction visible from here. */}
          <RowItem
            icon="globe"
            label={t('language.row')}
            value={language === 'system' ? t('language.system') : LOCALE_NAME[language]}
            onPress={() => { haptic.tap(); router.push('/language'); }}
          />
          <RowItem
            icon="paintpalette"
            label={t('me.appearance')}
            value={t(APPEARANCE_LABEL[profile.appearance] ?? 'appearance.system')}
            onPress={() => router.push('/settings/appearance')}
          />
          <RowItem icon="lock" label={t('me.yourData')} value={t('me.onThisDevice')} />
          <RowItem icon="arrow.counterclockwise" label={t('me.runOnboarding')} onPress={startOver} />
        </Section>

        <Txt variant="caption" tone="faint" style={{ textAlign: 'center' }}>
          {t('me.version')}
        </Txt>
      </ScrollView>

      <ScrollEdge title={t('me.title')} />
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
