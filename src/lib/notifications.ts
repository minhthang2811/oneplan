import { useCallback, useEffect } from 'react';
import { AppState } from 'react-native';
import * as Notifications from 'expo-notifications';
import type { Task } from '../store/types';
import { usePlanStore } from '../store/usePlanStore';
import {
  translate, useLanguageStore, resolveLocale, currentLocale, type Locale,
} from '../i18n';
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
const ID_PREFIX = 'pupu:';

/**
 * The prefix this module used when the app was called Oneplan.
 *
 * Reminders already sitting in the OS's pending list were named under it, and
 * the reconcile only ever touches ids it recognises — so without this the old
 * ones would be unownable: never refreshed, never cancelled, still firing days
 * after the activity they name was edited or deleted. They are swept rather
 * than re-adopted, because the same reconcile re-schedules everything still
 * wanted under the new prefix on the very same pass.
 */
const LEGACY_PREFIXES = ['oneplan:', 'oneplan-focus:'];

/**
 * The focus-session alarm's identifier, DELIBERATELY OUTSIDE `ID_PREFIX`.
 *
 * The reconcile below owns everything under `pupu:` — it walks the OS's
 * pending list and cancels every id with that prefix which is not in the plan
 * it just computed. A focus alarm is not an activity reminder and never
 * appears in that plan, so putting it under the same prefix would mean the
 * next reconcile silently deleted it, and a reconcile runs on every task edit.
 * The separate namespace is what keeps the two schedulers from fighting; it
 * lives here rather than in `focusAlarm.ts` so the rule is visible from the
 * loop that would otherwise break it.
 */
export const FOCUS_ID = 'pupu-focus:session';

/**
 * iOS keeps only the soonest 64 pending local notifications and silently drops
 * the rest. A planner accumulates future-dated activities, so the horizon is
 * trimmed here on purpose rather than discovered later as "reminders stop
 * working somewhere past next week".
 */
const MAX_PENDING = 64;

/**
 * Exported because the focus alarm schedules onto the SAME channel.
 *
 * Two channels would mean two rows in Android's notification settings for what
 * a user experiences as one app talking to them, and the second one would have
 * to be created and named separately — which is exactly the step the focus
 * alarm originally forgot, leaving it channel-less and therefore undelivered.
 */
export const ANDROID_CHANNEL_ID = 'reminders';

/**
 * Registered at import time rather than inside a component: iOS asks the
 * handler how to present a notification the moment one arrives, which can be
 * before any screen has mounted. Without it a reminder that lands while the
 * user is looking at the app is swallowed — the one case where they are most
 * certainly watching.
 */
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    /**
     * A FOCUS ALARM IS SUPPRESSED WHILE THE APP IS IN FRONT.
     *
     * It exists for the case where the phone is face down. If the user is
     * looking at the Focus screen when the timer ends, they get the ring
     * finishing, a success haptic, Pupu and the confetti — a banner on top of
     * that is the same news delivered twice, and it covers the celebration it
     * is announcing. Activity reminders are NOT suppressed: those are about
     * something the user is not currently doing, which is worth saying even
     * when the app is open.
     */
    const focusAlarm = notification.request.content.data?.kind === 'focus';
    const foreground = AppState.currentState === 'active';
    const show = !(focusAlarm && foreground);
    return {
      shouldShowBanner: show,
      shouldShowList: show,
      // Android suppresses the heads-up banner entirely when this is false,
      // whatever the priority says, so it is not merely a taste setting.
      shouldPlaySound: show,
      shouldSetBadge: false,
    };
  },
});

// ---- permission ------------------------------------------------------------

/**
 * Provisional authorisation counts: iOS grants it without a prompt and still
 * delivers, just quietly into Notification Centre.
 */
function isAllowed(status: Notifications.NotificationPermissionsStatus): boolean {
  return status.granted || status.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
}

/**
 * ── THIS ONE MUST BE ALLOWED TO THROW ──────────────────────────────────────
 * It briefly had a `try/catch` returning `false`, matching the request below,
 * and that was a bad trade dressed up as hardening. The two calls answer
 * different questions and their failures mean different things.
 *
 * `false` here does not mean "we could not ask", it means "the user has said
 * no" — and `reconcile` acts on that by cancelling every pending reminder,
 * while `useTaskNotifications` switches the feature off and records a
 * revocation the settings screen then explains as "turned off in iOS
 * Settings". A transient native failure would therefore delete the user's
 * reminders and blame them for it.
 *
 * Letting it throw restores the behaviour `syncTaskNotifications` already
 * documents: a sync that blew up is no evidence about permission, so it
 * reports the status quo rather than talking the caller into switching the
 * feature off underneath the user. Callers that need a value for display must
 * handle the rejection themselves and say "unknown", not "denied".
 */
export async function hasNotificationPermission(): Promise<boolean> {
  return (await notificationPermission()) === 'allowed';
}

export type NotificationPermission = 'allowed' | 'unasked' | 'denied';

/**
 * The same reading, with "never asked" kept apart from "said no".
 *
 * `hasNotificationPermission` folds the two together, which is right for the
 * scheduler — neither one delivers anything — and wrong for a screen that has
 * to tell the user what to DO about it. Anyone who answered "Not right now" in
 * onboarding has never been asked by iOS at all, and iOS gives an app no
 * Notifications page in Settings until it has asked once. So a row that read
 * "Not allowed" and opened Settings dropped them on the Settings ROOT, with no
 * Pupu page and nothing to switch on — a dead end that looked like a way out.
 *
 * THE SPLIT IS THE STATUS, NOT `canAskAgain`. That flag reads the same on iOS,
 * but on Android 13+ it stays true after the FIRST refusal (the OS allows one
 * more prompt), so it labelled someone who had already said no as never asked.
 * `undetermined` is exactly "never asked" on both platforms, and Android below
 * 13 never reports it at all — there notifications are simply on or off.
 *
 * Throws for the same reason `hasNotificationPermission` does, and display
 * callers treat that the same way — as unknown, never as denied.
 */
export async function notificationPermission(): Promise<NotificationPermission> {
  const status = await Notifications.getPermissionsAsync();
  if (isAllowed(status)) return 'allowed';
  return status.status === Notifications.PermissionStatus.UNDETERMINED ? 'unasked' : 'denied';
}

/**
 * Asks the OS. Once the user has said no, iOS resolves this instantly with the
 * old denial and shows nothing, so a `false` here means "send them to
 * Settings", not "try again".
 *
 * ── IT MUST NEVER REJECT ───────────────────────────────────────────────────
 * The caller is a switch. An exception here — the native module unavailable,
 * a request already in flight, an entitlement missing from the build — rejects
 * the async handler, which React Native reports as an unhandled promise
 * rejection and the user sees as A SWITCH THAT WILL NOT MOVE: no prompt, no
 * alert, no error, nothing. That failure is indistinguishable from the feature
 * being broken, which is exactly what it was mistaken for.
 *
 * Reporting `false` turns it into the one case the UI already handles properly:
 * not permitted, here is the way to Settings.
 */
export async function requestNotificationPermission(): Promise<boolean> {
  try {
    return isAllowed(await Notifications.requestPermissionsAsync());
  } catch (err) {
    console.warn('[notifications] permission request failed', err);
    return false;
  }
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
 * How many of the plan's activities are even ELIGIBLE for a reminder.
 *
 * Exported because the settings screen needs it, and it needs it for a reason
 * that is the real defect this feature had: a reminder can only be attached to
 * something that sits at a time on a day, and most activities in this app do
 * not. Switching reminders on with nothing scheduled therefore did exactly
 * nothing, silently, forever — the switch said the feature was on, the OS had
 * no notifications, and there was no surface anywhere that could tell the user
 * the difference between "working" and "nothing to work on".
 */
export function remindableCount(tasks: Task[], lead: number): number {
  return plan(tasks, Date.now(), lead).length;
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

/**
 * What a reminder should say, given how far ahead of the activity it lands.
 *
 * Kept next to the scheduling rather than in the UI, because the onboarding
 * screen previews this copy and the promise it makes has to be the
 * notification the user actually receives.
 */
export function reminderBody(minutes: number, lead: number): string {
  /**
   * TWO SENTENCES, NOT A DASH.
   *
   * This was `Starts in ${lead} — ${duration}`, borrowing the shape of the
   * original `Starting now — 30m`, where the dash could only mean duration
   * because nothing else was in the line. With a lead time there are now two
   * durations in one sentence, and the preview rendered `Starts in 30m — 30m`,
   * which does not tell you which number is which. Naming both is worth the
   * extra word in a line that is read at a glance and acted on immediately.
   */
  const dur = formatDuration(minutes);
  return lead <= 0
    ? translate('notification.startingNow', { duration: dur })
    : translate('notification.startsIn', { lead: formatDuration(lead), duration: dur });
}

function plan(tasks: Task[], now: number, lead: number): Planned[] {
  const planned: Planned[] = [];

  for (const t of tasks) {
    const begins = startsAt(t);
    if (begins == null) continue;

    /**
     * THE LEAD TIME.
     *
     * The notification fires `lead` minutes BEFORE the activity, not at it.
     * Firing exactly on the start time is what this shipped with, and it is
     * the one moment a nudge cannot help: a reminder that arrives at the
     * instant you were supposed to have started is a notification about being
     * late. The whole value of a reminder is the gap between hearing it and
     * needing to act.
     */
    const at = new Date(begins.getTime() - lead * 60_000);

    // Something already ticked off does not need nudging, and iOS never
    // delivers a date trigger that is already in the past — scheduling one
    // would just consume a slot against the 64 limit forever.
    if (t.done || at.getTime() <= now) continue;

    const title = `${t.emoji}  ${t.title}`;
    const body = reminderBody(t.minutes, lead);
    /**
     * The fire time is folded in, so CHANGING THE LEAD TIME RESCHEDULES.
     * The reconcile below can only compare identifiers against the OS's
     * pending list — it never sees the input that produced them — so anything
     * that changes what a reminder is or when it lands has to change its id,
     * or the old one is recognised as still-wanted and left exactly where it
     * was. `at` already moves with the lead, which is why it is enough.
     */
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
 * The language the channel was last named in.
 *
 * Without it the `??=` below would freeze the channel's name at whatever the
 * app launched in, so a user who switches to Vietnamese keeps an "Activity
 * reminders" row in Android's own notification settings forever. Re-calling
 * `setNotificationChannelAsync` with the same id renames an existing channel,
 * so re-running it on a language change is both safe and the whole fix.
 */
let androidChannelLocale: Locale | null = null;

/**
 * Android 8+ drops any notification that is not assigned to a channel. Naming
 * one explicitly also means the row in Android's own settings reads "Activity
 * reminders" instead of the generic fallback.
 */
export function ensureAndroidChannel(): Promise<unknown> {
  if (process.env.EXPO_OS !== 'android') return Promise.resolve();
  const locale = currentLocale();
  if (androidChannel && androidChannelLocale === locale) return androidChannel;
  androidChannelLocale = locale;
  androidChannel = Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
    name: translate('notification.channel'),
    importance: Notifications.AndroidImportance.HIGH,
  });
  return androidChannel;
}

async function reconcile(tasks: Task[], enabled: boolean, lead: number): Promise<boolean> {
  // Permission is re-read every time instead of trusted from the stored flag,
  // because it can be revoked in iOS Settings while the app is not running.
  const permitted = enabled ? await hasNotificationPermission() : false;
  const wanted = new Map<string, Planned>(
    permitted ? plan(tasks, Date.now(), lead).map((p) => [p.identifier, p]) : []
  );

  if (wanted.size > 0) await ensureAndroidChannel();

  for (const pending of await Notifications.getAllScheduledNotificationsAsync()) {
    const { identifier } = pending;
    if (LEGACY_PREFIXES.some((p) => identifier.startsWith(p))) {
      await Notifications.cancelScheduledNotificationAsync(identifier);
      continue;
    }
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
export function syncTaskNotifications(
  tasks: Task[],
  enabled: boolean,
  lead: number
): Promise<boolean> {
  const run = chain.then(() => reconcile(tasks, enabled, lead)).catch((err: unknown) => {
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
  const lead = usePlanStore((s) => s.profile.reminderLead);
  /**
   * The language is a DEPENDENCY of the schedule, not just of the UI.
   *
   * A reminder's body is written when it is scheduled and then sits in the OS
   * for hours or days. Without this, switching to Vietnamese would leave every
   * already-pending notification to arrive in English. Because the visible copy
   * is folded into each identifier, a re-run after a language change sees every
   * pending id as stale and rewrites it — no special-casing needed here.
   */
  const locale = useLanguageStore((s) => resolveLocale(s.language, s.device));

  const sync = useCallback(() => {
    void syncTaskNotifications(tasks, reminders, lead).then((permitted) => {
      /**
       * The switch must not go on promising nudges the OS is discarding, so a
       * revoked permission turns the feature off rather than failing mute.
       *
       * IT ALSO HAS TO SAY SO. This used to flip the flag and nothing else,
       * which is the worst of both: the user comes back to the app, finds the
       * switch they turned on has turned itself off, and has no way to learn
       * that the reason is a permission they revoked in iOS Settings — it just
       * looks like the setting does not stick. `revokedAt` is the record that
       * it happened, and the settings screen reads it to explain itself.
       */
      if (reminders && !permitted) {
        usePlanStore.setState((s) => ({
          profile: { ...s.profile, reminders: false },
          remindersRevokedAt: Date.now(),
        }));
      }
    });
  }, [tasks, reminders, lead, locale]);

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
