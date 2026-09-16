import { useMemo } from 'react';
import { View, ScrollView, Switch, Pressable, ActionSheetIOS, Alert, Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Txt } from '../../src/components/Txt';
import { Icon } from '../../src/components/Icon';
import { Bloom } from '../../src/components/Bloom';
import { PipScene } from '../../src/components/mascot/PipScene';
import { TAB_BAR_HEIGHT } from '../../src/components/TabBar';
import { ScrollEdge, ScrollEdgeTitle, useScrollEdge } from '../../src/components/ScrollEdge';
import { useTheme } from '../../src/theme/useTheme';
import { radius, space } from '../../src/theme/tokens';
import { useT, useLanguageStore, hasKey, LOCALE_NAME, type TKey } from '../../src/i18n';
import { usePlanStore } from '../../src/store/usePlanStore';
import { dateKey, formatDurationShort } from '../../src/lib/time';
import { haptic } from '../../src/lib/haptics';
import { requestNotificationPermission } from '../../src/lib/notifications';
import type { SymbolViewProps } from 'expo-symbols';

export default function Me() {
  const insets = useSafeAreaInsets();
  const { c } = useTheme();
  const { t } = useT();
  const { edge, scrollProps } = useScrollEdge();
  const tasks = usePlanStore((s) => s.tasks);
  const profile = usePlanStore((s) => s.profile);
  const layout = usePlanStore((s) => s.layout);
  const setLayout = usePlanStore((s) => s.setLayout);
  const resetOnboarding = usePlanStore((s) => s.resetOnboarding);
  const language = useLanguageStore((s) => s.language);

  /**
   * What onboarding picked, read back. Without this the routine choice becomes
   * invisible the moment the tasks it created are edited, and there is nowhere
   * to check what the plan thinks your day looks like.
   */
  const routineSummary = useMemo(() => {
    const r = profile.routines;
    const parts = ([ 'morning', 'afternoon', 'evening' ] as const).filter((k) => r[k]?.length);
    const total = parts.reduce((n, k) => n + r[k].length, 0);
    if (total === 0) return t('me.routinesNone');
    return t('me.routinesPicked', { count: total });
  }, [profile.routines, t]);

  /**
   * The onboarding answer, which is stored as a translation KEY so it follows a
   * later language change. A build from before that stored the English sentence
   * itself, so anything unrecognised is shown as it was saved rather than as a
   * raw key.
   */
  const needText = useMemo(() => {
    const v = profile.need;
    if (!v) return null;
    return hasKey(v) ? t(v) : v;
  }, [profile.need, t]);

  const stats = useMemo(() => {
    const today = dateKey(new Date());
    const todays = tasks.filter((task) => task.date === today);
    const done = todays.filter((task) => task.done);
    const planned = todays.reduce((n, task) => n + task.minutes, 0);
    return { done: done.length, total: todays.length, planned };
  }, [tasks]);

  const toggleReminders = async (on: boolean) => {
    haptic.tick();
    // Turning this on has to survive an earlier "Don't Allow": iOS answers the
    // second request instantly with the stored denial and shows no prompt, so
    // the only honest move is to leave the switch off and point at Settings.
    if (on && !(await requestNotificationPermission())) {
      Alert.alert(t('me.notifOffTitle'), t('me.notifOffBody'), [
        { text: t('common.notNow'), style: 'cancel' },
        { text: t('common.openSettings'), onPress: () => Linking.openSettings() },
      ]);
      return;
    }
    usePlanStore.setState((s) => ({ profile: { ...s.profile, reminders: on } }));
  };

  const pickLayout = () => {
    haptic.tap();
    if (process.env.EXPO_OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: [t('me.compact'), t('me.timeline'), t('common.cancel')],
          cancelButtonIndex: 2,
          title: t('me.dayLayout'),
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
          destructiveButtonIndex: 0,
          cancelButtonIndex: 1,
          title: t('me.startOverTitle'),
          message: t('me.startOverBody'),
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
        {...scrollProps}
        /**
         * `never`, not `automatic`. The blurred edge is driven by
         * `contentOffset.y`, and an automatic content inset would start the
         * screen at a non-zero offset — which reads as "already scrolled" and
         * would show the bar over an untouched screen.
         */
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
          <Stat label={t('me.planned')} value={formatDurationShort(stats.planned)} sub={t('me.todaySub')} />
          <Stat label={t('me.activities')} value={`${tasks.length}`} sub={t('me.totalSub')} />
        </View>

        <Section title={t('me.planning')}>
          <RowItem
            icon="rectangle.3.group"
            label={t('me.dayLayout')}
            value={layout === 'compact' ? t('me.compact') : t('me.timeline')}
            onPress={pickLayout}
          />
          <RowItem icon="repeat" label={t('me.routines')} value={routineSummary} />
          <RowItem
            icon="bell"
            label={t('me.reminders')}
            trailing={<Switch value={profile.reminders} onValueChange={toggleReminders} />}
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
          <RowItem icon="paintpalette" label={t('me.appearance')} value={t('me.followsSystem')} />
          <RowItem icon="lock" label={t('me.yourData')} value={t('me.onThisDevice')} />
          <RowItem icon="arrow.counterclockwise" label={t('me.runOnboarding')} onPress={startOver} />
        </Section>

        <Txt variant="caption" tone="faint" style={{ textAlign: 'center' }}>
          {t('me.version')}
        </Txt>
      </ScrollView>

      <ScrollEdge edge={edge}>
        <ScrollEdgeTitle edge={edge} title={t('me.title')} />
      </ScrollEdge>
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
      {/* One line, always. A tile is a glanceable number; a serif display size
          that wraps onto a second line makes the three tiles disagree on height
          and stops reading as a number at all. `adjustsFontSizeToFit` is the
          backstop for large Dynamic Type, where even the short form runs out of
          room. */}
      <Txt variant="displaySm" tabular numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
        {value}
      </Txt>
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
