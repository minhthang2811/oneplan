import { useCallback, useEffect } from 'react';
import { AppState } from 'react-native';
import * as Notifications from 'expo-notifications';
import type { Task } from '../store/types';
import { usePlanStore } from '../store/usePlanStore';
import { formatDuration, parseKey } from './time';

/**
 * Local reminders: one notification per activity that sits at a real time on a
 * real day, fired at that wall-clock moment.
 *
 * Local notifications need no config plugin and no Info.plist usage string —
 * the permission prompt is the whole iOS requirement.
 */

/**
 * Every request this module owns is named with this prefix, so a reconcile can
 * recognise its own pending notifications and never cancels one that some
 * other part of the app scheduled.
 */
const ID_PREFIX = 'oneplan:';

/**
 * iOS keeps only the soonest 64 pending local notifications and silently drops
 * the rest. A planner accumulates future-dated activities, so the horizon is
 * trimmed here on purpose rather than discovered later as "reminders stop
 * working somewhere past next week".
 */
const MAX_PENDING = 64;

const ANDROID_CHANNEL_ID = 'reminders';

/**
 * Registered at import time rather than inside a component: iOS asks the
 * handler how to present a notification the moment one arrives, which can be
 * before any screen has mounted. Without it a reminder that lands while the
 * user is looking at the app is swallowed — the one case where they are most
 * certainly watching.
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    // Android suppresses the heads-up banner entirely when this is false,
    // whatever the priority says, so it is not merely a taste setting.
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// ---- permission ------------------------------------------------------------

/**
 * Provisional authorisation counts: iOS grants it without a prompt and still
 * delivers, just quietly into Notification Centre.
 */
function isAllowed(status: Notifications.NotificationPermissionsStatus): boolean {
  return status.granted || status.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
}

export async function hasNotificationPermission(): Promise<boolean> {
  return isAllowed(await Notifications.getPermissionsAsync());
}

/**
 * Asks the OS. Once the user has said no, iOS resolves this instantly with the
 * old denial and shows nothing, so a `false` here means "send them to
 * Settings", not "try again".
 */
export async function requestNotificationPermission(): Promise<boolean> {
  return isAllowed(await Notifications.requestPermissionsAsync());
}

// ---- what the plan wants scheduled -----------------------------------------

type Planned = {
  identifier: string;
  at: number;
  request: Notifications.NotificationRequestInput;
};

/** The local instant an activity begins, or null when it is not on the clock. */
function startsAt(t: Task): Date | null {
  if (t.date == null || t.startMinutes == null) return null;
  const d = parseKey(t.date);
  d.setHours(Math.floor(t.startMinutes / 60), t.startMinutes % 60, 0, 0);
  return d;
}

/**
 * Folds the visible copy into the identifier, so renaming an activity or
 * swapping its emoji yields a different id. That is what lets the reconcile
 * below notice a content change at all — comparing against the native pending
 * list only ever gives back identifiers, not the input that produced them.
 */
function fingerprint(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0;
  return h.toString(36);
}

function plan(tasks: Task[], now: number): Planned[] {
  const planned: Planned[] = [];

  for (const t of tasks) {
    const at = startsAt(t);
    if (at == null) continue;
    // Something already ticked off does not need nudging, and iOS never
    // delivers a date trigger that is already in the past — scheduling one
    // would just consume a slot against the 64 limit forever.
    if (t.done || at.getTime() <= now) continue;

    const title = `${t.emoji}  ${t.title}`;
    // The wording the onboarding screen previews, so the promise it makes is
    // the notification the user actually receives.
    const body = `Starting now — ${formatDuration(t.minutes)}`;
    const identifier = `${ID_PREFIX}${t.id}:${at.getTime()}:${fingerprint(`${title}${body}`)}`;

    planned.push({
      identifier,
      at: at.getTime(),
      request: {
        identifier,
        content: { title, body, sound: true, data: { taskId: t.id } },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: at,
          channelId: ANDROID_CHANNEL_ID,
        },
      },
    });
  }

  return planned.sort((a, b) => a.at - b.at).slice(0, MAX_PENDING);
}

// ---- reconcile -------------------------------------------------------------

let androidChannel: Promise<unknown> | null = null;

/**
 * Android 8+ drops any notification that is not assigned to a channel. Naming
 * one explicitly also means the row in Android's own settings reads "Activity
 * reminders" instead of the generic fallback.
 */
function ensureAndroidChannel(): Promise<unknown> {
  if (process.env.EXPO_OS !== 'android') return Promise.resolve();
  androidChannel ??= Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
    name: 'Activity reminders',
    importance: Notifications.AndroidImportance.HIGH,
  });
  return androidChannel;
}

async function reconcile(tasks: Task[], enabled: boolean): Promise<boolean> {
  // Permission is re-read every time instead of trusted from the stored flag,
  // because it can be revoked in iOS Settings while the app is not running.
  const permitted = enabled ? await hasNotificationPermission() : false;
  const wanted = new Map<string, Planned>(
    permitted ? plan(tasks, Date.now()).map((p) => [p.identifier, p]) : []
  );

  if (wanted.size > 0) await ensureAndroidChannel();

  for (const pending of await Notifications.getAllScheduledNotificationsAsync()) {
    const { identifier } = pending;
    if (!identifier.startsWith(ID_PREFIX)) continue;
    // Deleting doubles as the test: a hit means this one is already scheduled
    // exactly as wanted and must be left alone, so what survives the loop is
    // precisely the set still missing.
    if (wanted.delete(identifier)) continue;
    await Notifications.cancelScheduledNotificationAsync(identifier);
  }

  for (const p of wanted.values()) {
    await Notifications.scheduleNotificationAsync(p.request);
  }

  return permitted;
}

/**
 * Runs are chained rather than fired in parallel: read-cancel-schedule is a
 * read-modify-write against OS state, and two overlapping passes would both
 * see the same pending list and schedule the same reminder twice.
 */
let chain: Promise<unknown> = Promise.resolve();

/**
 * Brings the OS's pending notifications in line with the plan. Resolves false
 * only when reminders are switched on and the OS has refused to deliver them,
 * so the caller can stop claiming the feature is active. Never rejects.
 */
export function syncTaskNotifications(tasks: Task[], enabled: boolean): Promise<boolean> {
  const run = chain.then(() => reconcile(tasks, enabled)).catch((err: unknown) => {
    // A sync that blew up is no evidence that permission was revoked, so it
    // reports the status quo rather than talking the caller into switching the
    // feature off underneath the user.
    console.warn('[notifications] could not sync reminders', err);
    return enabled;
  });
  chain = run;
  return run;
}

/**
 * Keeps the schedule in step with the plan for as long as the app is mounted.
 * Mounted once, at the root — two copies would not corrupt anything (the sync
 * is idempotent and serialized) but would double the native chatter.
 */
export function useTaskNotifications(): void {
  const tasks = usePlanStore((s) => s.tasks);
  const reminders = usePlanStore((s) => s.profile.reminders);

  const sync = useCallback(() => {
    void syncTaskNotifications(tasks, reminders).then((permitted) => {
      // The switch in Me must not go on promising nudges the OS is discarding,
      // so a revoked permission turns the feature off rather than failing mute.
      if (reminders && !permitted) {
        usePlanStore.setState((s) => ({ profile: { ...s.profile, reminders: false } }));
      }
    });
  }, [tasks, reminders]);

  useEffect(sync, [sync]);

  useEffect(() => {
    // Returning to the foreground is the only moment the app can learn that
    // permission changed in Settings, or that the day rolled over and this
    // morning's reminders are now past due and worth reclaiming.
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') sync();
    });
    return () => sub.remove();
  }, [sync]);
}
