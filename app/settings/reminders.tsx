import { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Switch, Alert, Linking, AppState } from 'react-native';
import Animated, { FadeIn, FadeOut, useReducedMotion } from 'react-native-reanimated';
import { Txt } from '../../src/components/Txt';
import { Icon } from '../../src/components/Icon';
import { EmojiAvatar } from '../../src/components/EmojiAvatar';
import { Button } from '../../src/components/Button';
import { SettingsScreen, Section, RowItem, ChoiceRow } from '../../src/components/Settings';
import { useTheme } from '../../src/theme/useTheme';
import { radius, space } from '../../src/theme/tokens';
import { useT, translate } from '../../src/i18n';
import { usePlanStore } from '../../src/store/usePlanStore';
import {
  hasNotificationPermission, requestNotificationPermission, remindableCount, reminderBody,
} from '../../src/lib/notifications';
import { formatDuration } from '../../src/lib/time';
import { useNowMinutes } from '../../src/lib/useNowMinutes';
import { haptic } from '../../src/lib/haptics';

/**
 * The lead times worth offering.
 *
 * Zero is kept, because someone may genuinely want the nudge at the moment the
 * thing starts, but it is no longer the DEFAULT and it is no longer the only
 * option — which is what it was, and what made the feature close to useless:
 * a reminder that arrives exactly when you should already have begun is a
 * notification about being late.
 */
const LEADS = [0, 5, 10, 15, 30];

function leadLabel(m: number): string {
  return m === 0
    ? translate('reminderSettings.asItStarts')
    : translate('reminderSettings.before', { duration: formatDuration(m) });
}

export default function Reminders() {
  const { c, shadow } = useTheme();
  const { t } = useT();
  const reduced = useReducedMotion();

  const tasks = usePlanStore((s) => s.tasks);
  const enabled = usePlanStore((s) => s.profile.reminders);
  const lead = usePlanStore((s) => s.profile.reminderLead);
  const revokedAt = usePlanStore((s) => s.remindersRevokedAt);
  const setReminders = usePlanStore((s) => s.setReminders);
  const setReminderLead = usePlanStore((s) => s.setReminderLead);

  /**
   * What the OS currently thinks, as opposed to what the app has stored.
   *
   * These two can disagree at any moment — permission is revocable from iOS
   * Settings while the app is not even running — and the whole reason this
   * screen exists is that the app used to have no way of SAYING they disagreed.
   * It re-reads on every return to the foreground, because coming back from
   * Settings is exactly the moment the answer changes.
   */
  const [permitted, setPermitted] = useState<boolean | null>(null);
  const refresh = useCallback(() => {
    // `null` is UNKNOWN, not denied, and that distinction is the whole reason
    // this has a catch: `hasNotificationPermission` throws rather than
    // reporting `false` when it cannot ask, so that a native failure is never
    // mistaken for the user having said no. The row reads "Checking…".
    hasNotificationPermission().then(setPermitted, () => setPermitted(null));
  }, []);

  useEffect(() => {
    refresh();
    const sub = AppState.addEventListener('change', (s) => { if (s === 'active') refresh(); });
    return () => sub.remove();
  }, [refresh]);

  /**
   * How many reminders this setting will actually produce.
   *
   * This number is the answer to the real complaint about this feature. A
   * reminder can only attach to an activity that sits at a time on a day, and
   * most activities in this app do not — so switching the feature on could
   * schedule nothing at all, and there was no surface anywhere that could tell
   * the difference between "working" and "nothing to work on". Now the screen
   * says which it is.
   */
  /**
   * `now` is in the deps because the count is a function of the CLOCK, not
   * only of the plan. `remindableCount` filters on `at <= now`, so a memo
   * keyed on tasks and settings alone kept asserting "1 reminder is scheduled"
   * after that reminder had already fired — on the one number whose entire job
   * is to be trustworthy, since it is what separates "working" from "nothing
   * to schedule". `useNowMinutes` is the app's existing minute ticker.
   */
  const now = useNowMinutes();
  const scheduled = useMemo(
    () => (enabled && permitted ? remindableCount(tasks, lead) : 0),
    // `remindableCount` reads `Date.now()` internally; `now` is the trigger.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tasks, lead, enabled, permitted, now]
  );

  const timedTotal = useMemo(
    () => tasks.filter((t) => t.date != null && t.startMinutes != null && !t.done).length,
    [tasks]
  );

  const toggle = async (on: boolean) => {
    haptic.tick();
    if (!on) { setReminders(false); return; }

    // Turning this on has to survive an earlier "Don't Allow": iOS answers the
    // second request instantly with the stored denial and shows no prompt, so
    // the only honest move is to leave the switch off and point at Settings.
    const granted = await requestNotificationPermission();
    setPermitted(granted);
    if (!granted) {
      Alert.alert(
        t('me.notifOffTitle'),
        t('me.notifOffBody'),
        [
          { text: t('common.notNow'), style: 'cancel' },
          { text: t('common.openSettings'), onPress: () => Linking.openSettings() },
        ]
      );
      return;
    }
    setReminders(true);
  };

  /** The exact copy the OS will deliver, so the screen cannot over-promise. */
  // The same activity the onboarding preview shows, resolved from the routine
  // catalogue so the two screens cannot drift — and so it follows the language.
  const preview = {
    emoji: '🌅',
    title: t('routineParent.morning'),
    body: reminderBody(30, lead),
  };

  return (
    <SettingsScreen
      title={t('reminderSettings.title')}
      subtitle={t('reminderSettings.subtitle')}
    >
      {/*
        THE BANNER ONLY APPEARS WHEN SOMETHING IS ACTUALLY WRONG.
        Previously the app silently switched `reminders` off when it found the
        permission revoked, which from the user's side looks exactly like a
        setting that will not stick. This is the sentence that was missing.
      */}
      {revokedAt != null && !enabled ? (
        <Animated.View
          entering={reduced ? undefined : FadeIn.duration(240)}
          exiting={reduced ? undefined : FadeOut.duration(160)}
          style={{
            flexDirection: 'row', gap: space.md, padding: space.base,
            borderRadius: radius.card, borderCurve: 'continuous',
            backgroundColor: c.accentSoft,
          }}
        >
          <Icon name="exclamationmark.triangle.fill" size={17} color={c.accentInk} />
          <View style={{ flex: 1, gap: space.sm }}>
            <Txt variant="bodyStrong" color={c.accentInk}>{t('reminderSettings.switchedOff')}</Txt>
            <Txt variant="caption" tone="muted">
              {t('reminderSettings.switchedOffBody')}
            </Txt>
            <Button
              label={t('common.openSettings')}
              fullWidth={false}
              variant="outline"
              onPress={() => Linking.openSettings()}
            />
          </View>
        </Animated.View>
      ) : null}

      {/*
        THE OS'S OWN ANSWER, STATED PLAINLY.

        The app's switch and the system permission are two different things and
        they can disagree at any moment — permission is revocable from iOS
        Settings while the app is not even running. Without this row the only
        symptom of that disagreement is a switch that refuses to move, which
        reads as the app being broken rather than as a permission being off.
      */}
      <Section title={t('reminderSettings.notifications')}>
        <RowItem
          icon={permitted === false ? 'bell.slash' : 'bell.badge'}
          label={t('reminderSettings.systemPermission')}
          value={
            permitted == null
              ? t('reminderSettings.checking')
              : t(permitted ? 'reminderSettings.allowed' : 'reminderSettings.notAllowed')
          }
          onPress={permitted === false ? () => Linking.openSettings() : undefined}
        />
      </Section>

      <Section
        footer={
          enabled && permitted
            ? scheduled > 0
              ? `${scheduled} ${scheduled === 1 ? 'reminder is' : 'reminders are'} scheduled.`
              : timedTotal === 0
                ? t('reminderSettings.nothingWithTimes')
                : t('reminderSettings.nothingToday')
            : undefined
        }
      >
        <RowItem
          icon="bell"
          label={t('reminderSettings.activityReminders')}
          trailing={
            <Switch
              value={enabled}
              onValueChange={toggle}
              // Without this VoiceOver reads "switch, off" with no indication
              // of what it controls: the label beside it is a SIBLING, not a
              // label, and iOS does not associate the two.
              accessibilityLabel={t('reminderSettings.activityReminders')}
            />
          }
        />
      </Section>

      {enabled ? (
        <Animated.View
          entering={reduced ? undefined : FadeIn.duration(220)}
          style={{ gap: space.xl }}
        >
          <Section title={t('reminderSettings.when')} footer={t('reminderSettings.whenFooter')}>
            {LEADS.map((m, i) => (
              <ChoiceRow
                key={m}
                label={leadLabel(m)}
                hint={m === 10 ? t('reminderSettings.tenHint') : undefined}
                first={i === 0}
                selected={lead === m}
                onPress={() => setReminderLead(m)}
              />
            ))}
          </Section>

          <View style={{ gap: space.sm }}>
            <Txt variant="micro" tone="faint">WHAT YOU WILL SEE</Txt>
            {/* Built from `reminderBody`, the same function that writes the
                real notification — so this preview cannot drift from it. */}
            <View
              style={{
                flexDirection: 'row', alignItems: 'center', gap: space.md,
                padding: space.md, borderRadius: radius.card, borderCurve: 'continuous',
                backgroundColor: c.surface, boxShadow: shadow[1],
              }}
              accessible
              accessibilityLabel={`Example notification. ${preview.title}. ${preview.body}`}
            >
              <EmojiAvatar emoji={preview.emoji} tint="peach" size={38} />
              <View style={{ flex: 1, gap: 1 }}>
                <Txt variant="micro" tone="faint">ONEPLAN</Txt>
                <Txt variant="bodyStrong">{preview.title}</Txt>
                <Txt variant="caption" tone="muted">{preview.body}</Txt>
              </View>
            </View>
          </View>
        </Animated.View>
      ) : null}

      <Txt variant="caption" tone="faint" style={{ textAlign: 'center' }}>
        {t('reminderSettings.privacyNote')}
      </Txt>
    </SettingsScreen>
  );
}
