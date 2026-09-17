import { useCallback, useEffect } from 'react';
import { AppState } from 'react-native';
import * as Notifications from 'expo-notifications';
import { usePlanStore, remainingFor } from '../store/usePlanStore';
import { hasNotificationPermission, FOCUS_ID } from './notifications';
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
 * ── IT NEVER ASKS FOR PERMISSION ───────────────────────────────────────────
 * Permission is read, never requested. Starting a timer is not the moment to
 * interrupt someone with a system prompt — they are, by definition, trying to
 * begin something — so this is a quiet upgrade for anyone who has already
 * allowed notifications, and silence for everyone else.
 */
async function arm(focus: FocusSession | null): Promise<void> {
  // Always clear first. This is what makes pause, end and reschedule the same
  // operation, and it is safe against an identifier that is not there.
  await Notifications.cancelScheduledNotificationAsync(FOCUS_ID).catch(() => {});

  if (!focus || focus.startedAt == null) return;

  const seconds = remainingFor(focus);
  // Already over, or so close that the banner would land after the screen has
  // celebrated anyway. iOS also refuses a trigger that is already in the past.
  if (seconds < 2) return;

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

  await Notifications.scheduleNotificationAsync({
    identifier: FOCUS_ID,
    content: {
      title: translate('focus.alarmTitle'),
      body: translate('focus.alarmBody'),
      sound: true,
      data: { kind: 'focus' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: Math.round(seconds),
      repeats: false,
    },
  }).catch(() => {
    // Nothing to recover and nothing to say: the in-app countdown is
    // unaffected, so a failure here costs the banner and not the session.
  });
}

export function useFocusAlarm(): void {
  const focus = usePlanStore((s) => s.focus);

  const reconcile = useCallback(() => { void arm(usePlanStore.getState().focus); }, []);

  // Every transition of the session is a new object, so this covers start,
  // pause, resume, extend and end without enumerating them.
  useEffect(() => { void arm(focus); }, [focus]);

  /**
   * Re-armed on foreground. A TIME_INTERVAL trigger counts from the moment it
   * was scheduled, while the session's own deadline is absolute — so after a
   * long suspend the two can disagree, and re-deriving the interval from
   * `startedAt` is what keeps the banner landing when the ring says it will.
   */
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') reconcile();
    });
    return () => sub.remove();
  }, [reconcile]);
}
