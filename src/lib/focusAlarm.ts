import { useCallback, useEffect } from 'react';
import { AppState } from 'react-native';
import * as Notifications from 'expo-notifications';
import { usePlanStore, remainingFor } from '../store/usePlanStore';
import {
  hasNotificationPermission, ensureAndroidChannel, ANDROID_CHANNEL_ID, FOCUS_ID,
} from './notifications';
import { translate } from '../i18n';
import type { FocusSession } from '../store/types';

/**
 * THE END OF A FOCUS SESSION, WHEN NOBODY IS LOOKING AT THE SCREEN.
 *
 * The countdown is a `setInterval` inside the Focus screen, so it only exists
 * while that screen is mounted and the app is in the foreground. That is fine
 * for the ring, which nobody can see otherwise — and it meant the one thing a
 * focus timer is FOR did not happen: you set twenty-five minutes, put the phone
 * face down, and twenty-five minutes later nothing at all told you. The session
 * had quietly ended some time ago, and the only way to find out was to pick the
 * phone up and look, which is precisely what the session was supposed to make
 * unnecessary.
 *
 * ── ONE NOTIFICATION, RECONCILED, NEVER TWO ────────────────────────────────
 * A fixed identifier makes scheduling idempotent: every pass cancels whatever
 * was there and writes at most one replacement, so starting, pausing, resuming,
 * adding a minute and ending all fall out of the same code path instead of each
 * needing its own bookkeeping. Pausing cancels, because a paused session has no
 * deadline — which is the whole point of pausing.
 *
 * ── IT FOLLOWS THE REMINDERS SWITCH, NOT JUST THE OS ───────────────────────
 * Gating on OS permission alone was wrong in a way the user would experience as
 * the app ignoring them: someone who grants notifications, finds the app too
 * noisy and turns "Activity reminders" off would still get focus banners, from
 * a screen that had just told them notifications were off. The Reminders screen
 * is this app's single control over whether it may interrupt you, so it governs
 * both. Permission is then read, never requested — starting a timer is not the
 * moment to interrupt someone with a system prompt.
 */
function alarmContent(): Notifications.NotificationRequestInput['content'] {
  return {
    title: translate('focus.alarmTitle'),
    body: translate('focus.alarmBody'),
    sound: true,
    data: { kind: 'focus' },
  };
}

async function reconcileAlarm(focus: FocusSession | null): Promise<void> {
  // Always clear first. This is what makes pause, end and reschedule the same
  // operation, and it is safe against an identifier that is not there.
  await Notifications.cancelScheduledNotificationAsync(FOCUS_ID).catch(() => {});

  if (!focus || focus.startedAt == null) return;

  const seconds = remainingFor(focus);
  // Already over, or so close that the banner would land after the screen has
  // celebrated anyway. iOS also refuses a trigger that is already in the past.
  if (seconds < 2) return;

  const { profile } = usePlanStore.getState();
  if (!profile.reminders) return;
  if (!(await hasNotificationPermission().catch(() => false))) return;

  /**
   * RE-READ, NOT TRUSTED. The permission check above is a native round trip,
   * and a session can be ended or paused while it is in flight — scheduling
   * off the stale argument would leave an alarm for a session that no longer
   * exists, which is the one failure mode a user would read as the app
   * inventing notifications.
   */
  const live = usePlanStore.getState().focus;
  if (!live || live.startedAt == null || live.startedAt !== focus.startedAt) return;

  /**
   * THE CHANNEL IS NOT OPTIONAL ON ANDROID, and leaving it off is why this
   * originally did nothing there. Android 8+ discards any notification that is
   * not assigned to a channel — the same rule `reconcile` obeys for activity
   * reminders — so a channel-less alarm is scheduled successfully, reported as
   * scheduled, and simply never delivered. It rides the existing "reminders"
   * channel rather than creating a second one, so Android's own settings show
   * one row for one app's notifications.
   */
  await ensureAndroidChannel();

  await Notifications.scheduleNotificationAsync({
    identifier: FOCUS_ID,
    content: alarmContent(),
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: Math.round(seconds),
      repeats: false,
      channelId: ANDROID_CHANNEL_ID,
    },
  }).catch(() => {
    // Nothing to recover and nothing to say: the in-app countdown is
    // unaffected, so a failure here costs the banner and not the session.
  });
}

/**
 * Runs are CHAINED, never overlapped.
 *
 * `reconcileAlarm` is cancel-then-schedule across two awaits, which is a
 * read-modify-write against OS state — and the transitions that drive it come
 * in bursts: tapping "+ 1 min" twice, or pause-then-resume, fires it again
 * before the first pass has returned. Interleaved, the two cancels and two
 * schedules can land in any order, and because both write the same identifier
 * the loser silently wins: the alarm ends up at the previous deadline, or a
 * late cancel removes the one that was just written and the session ends in
 * silence. `syncTaskNotifications` serialises for exactly this reason; this is
 * the same hazard on the same API.
 */
let chain: Promise<unknown> = Promise.resolve();

function armAlarm(focus: FocusSession | null): void {
  chain = chain.then(() => reconcileAlarm(focus)).catch(() => {});
}

export function useFocusAlarm(): void {
  const focus = usePlanStore((s) => s.focus);
  /**
   * The reminders switch is a DEPENDENCY, not just a read. Turning it off has
   * to cancel a pending alarm, and turning it on mid-session has to schedule
   * one — neither happens if the effect only watches the session.
   */
  const reminders = usePlanStore((s) => s.profile.reminders);

  // Every transition of the session is a new object, so this covers start,
  // pause, resume, extend and end without enumerating them.
  useEffect(() => { armAlarm(focus); }, [focus, reminders]);

  /**
   * Re-armed on foreground. A TIME_INTERVAL trigger counts from the moment it
   * was scheduled, while the session's own deadline is absolute — so after a
   * long suspend the two can disagree, and re-deriving the interval from
   * `startedAt` is what keeps the banner landing when the ring says it will.
   */
  const reconcile = useCallback(() => {
    armAlarm(usePlanStore.getState().focus);
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') reconcile();
    });
    return () => sub.remove();
  }, [reconcile]);
}
