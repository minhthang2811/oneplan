import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { mmkvStorage } from './storage';
import type {
  Task, FocusSession, Profile, Priority, AppearancePref, CustomRoutineStep,
  RoutineStepEdit,
} from './types';
import { seedTasks } from '../data/seed';
import {
  ROUTINES, ROUTINE_PARENT, ROUTINE_SLOTS, routineTitle, routineParentTitle,
  routineTaskId, isRoutineTask, type RoutineSlot,
} from '../data/routines';
import { dateKey, slotForMinutes, type Slot } from '../lib/time';

let counter = 0;
const newId = () => `t${Date.now().toString(36)}${(counter++).toString(36)}`;

type NewTask = Partial<Task> & Pick<Task, 'title'>;

interface PlanState {
  tasks: Task[];
  onboarded: boolean;
  profile: Profile;
  focus: FocusSession | null;
  /** 'compact' groups by time-of-day; 'timeline' lays the day out against a clock. */
  layout: 'compact' | 'timeline';
  /**
   * When the OS was last found to have revoked notification permission while
   * reminders were switched on, or null.
   *
   * Top-level rather than inside `profile`, because it is not a preference —
   * it is a record of something that HAPPENED to the app. Its only job is to
   * let the settings screen explain why a switch the user turned on is off
   * again; without it, a permission revoked in iOS Settings makes the feature
   * look like it simply does not stick.
   */
  remindersRevokedAt: number | null;

  /**
   * The last date each slot's routine activity was materialised for.
   *
   * This is what makes a routine REPEAT without also making it un-deletable.
   * `ensureToday` builds a slot's activity only when this does not already say
   * today, so a routine someone deliberately deleted this morning stays
   * deleted until tomorrow instead of reappearing on the next foreground.
   *
   * Top-level rather than in `profile` for the same reason as
   * `remindersRevokedAt`: it is a record of what the app has DONE, not a
   * preference the user set.
   */
  routinesBuiltFor: Record<RoutineSlot, string | null>;

  addTask: (t: NewTask) => string;
  updateTask: (id: string, patch: Partial<Task>) => void;
  removeTask: (id: string) => void;
  toggleTask: (id: string) => void;
  toggleStep: (taskId: string, stepId: string) => void;
  addStep: (taskId: string, title: string) => void;
  removeStep: (taskId: string, stepId: string) => void;
  moveTask: (id: string, date: string | null) => void;
  setLayout: (l: 'compact' | 'timeline') => void;

  completeOnboarding: (p: Partial<Profile>) => void;
  resetOnboarding: () => void;
  applyRoutines: (picks: Record<RoutineSlot, string[]>) => void;

  setAppearance: (a: AppearancePref) => void;
  setReminders: (on: boolean) => void;
  setReminderLead: (minutes: number) => void;

  /** Adds or removes one step from a slot's routine, preserving order. */
  toggleRoutineStep: (slot: RoutineSlot, stepId: string) => void;
  /** Moves a step by `delta` places within its slot. */
  moveRoutineStep: (slot: RoutineSlot, stepId: string, delta: number) => void;
  /** Writes a user-authored step into the catalogue for `slot` and selects it. */
  addRoutineStep: (slot: RoutineSlot, step: Omit<CustomRoutineStep, 'id'>) => void;
  /** Changes one step's title and/or length, for catalogue and custom alike. */
  editRoutineStep: (slot: RoutineSlot, stepId: string, patch: RoutineStepEdit) => void;
  /** Drops the user's edit, returning the step to the catalogue's wording. */
  resetRoutineStep: (slot: RoutineSlot, stepId: string) => void;
  setRoutineTime: (slot: RoutineSlot, startMinutes: number) => void;
  /** Rebuilds ONE slot's routine activity on today from the stored config. */
  syncRoutines: (slot: RoutineSlot) => void;
  /**
   * Materialises today's routine activities. Idempotent — call it freely on
   * launch, on foreground, and when the clock crosses midnight.
   */
  ensureToday: () => void;
  /** Moves every unfinished, non-routine activity from a past day onto `date`. */
  carryOver: (date: string) => void;

  startFocus: (totalSeconds: number, taskId?: string | null) => void;
  pauseFocus: () => void;
  resumeFocus: () => void;
  extendFocus: (seconds: number) => void;
  endFocus: () => void;
  /** Drops a running session whose deadline passed long before this launch. */
  reconcileFocus: () => void;
}

/**
 * How long after a session's deadline the app will still celebrate it.
 *
 * A focus session is persisted with an ABSOLUTE deadline, which is what keeps
 * the countdown honest across a background — and what made a force-quit
 * resurface days later as a party. Reopening the app on Thursday to confetti, a
 * success haptic and "Time's up" for a Tuesday session the user abandoned is
 * the app congratulating them for something that did not happen.
 *
 * The window exists because the opposite mistake is just as real: someone who
 * backgrounds the app for the last two minutes of a session and comes back HAS
 * finished it, and deserves the ending. Ten minutes is long enough to cover
 * that and short enough that nothing stale gets through.
 */
const FOCUS_STALE_MS = 10 * 60 * 1000;

const emptyRoutines = (): Profile['routines'] => ({ morning: [], afternoon: [], evening: [] });
const emptyBuilt = (): Record<RoutineSlot, string | null> => ({
  morning: null, afternoon: null, evening: null,
});
const emptyCustom = (): Profile['routineCustom'] => ({ morning: [], afternoon: [], evening: [] });
const emptyEdits = (): Profile['routineEdits'] => ({ morning: {}, afternoon: {}, evening: {} });
const defaultTimes = (): Profile['routineTimes'] => ({
  morning: ROUTINE_PARENT.morning.startMinutes,
  afternoon: ROUTINE_PARENT.afternoon.startMinutes,
  evening: ROUTINE_PARENT.evening.startMinutes,
});

const emptyProfile: Profile = {
  name: '', need: null, rhythm: null,
  reminders: false,
  /**
   * TEN MINUTES BEFORE, not on the hour — and existing users move too.
   *
   * This is a deliberate behaviour change on upgrade, not an accident of how
   * the defaults merge. Firing at the exact start time was the app's only
   * option and it is the one moment a nudge cannot help: a reminder that
   * arrives when you were supposed to have started is a notification about
   * being late. Preserving that for existing users would be preserving the
   * defect. The setting is on its own screen, states the value plainly, and
   * previews the notification it produces.
   */
  reminderLead: 10,
  routines: emptyRoutines(),
  routineTimes: defaultTimes(),
  routineCustom: emptyCustom(),
  routineEdits: emptyEdits(),
  appearance: 'system',
};

/**
 * Every step a slot can offer, catalogue plus the user's own, in one list.
 *
 * Exported because the routines screen and the store both have to resolve an
 * id to a step, and two copies of that lookup is exactly how a custom step
 * ends up rendering in one place and vanishing in the other.
 */
export function routineCatalogue(
  profile: Profile,
  slot: RoutineSlot
): CustomRoutineStep[] {
  return [
    /**
     * Catalogue steps carry no stored title: their `id` IS their translation
     * key, so the words follow the app's language. This function is already
     * the one place an id resolves to a step, which makes it the only place
     * that has to know that.
     *
     * A user's OWN steps are spread in untouched. They were typed by a person
     * in whatever language that person was using, and translating them would
     * mean overwriting their words with ours.
     */
    ...ROUTINES[slot].map((o) => ({ ...o, title: routineTitle(o.id) })),
    ...(profile.routineCustom?.[slot] ?? []),
  ].map((o) => {
    /**
     * THE USER'S EDIT WINS, FIELD BY FIELD.
     *
     * Applied here rather than at any call site because this function is
     * already the single place an id resolves to a step — the same argument
     * the comment above makes about custom steps. An edit applied in the
     * routines screen but not in `buildRoutine` would show one wording on the
     * settings screen and another on the day it produces.
     *
     * Spread field-by-field so an edit to the duration alone leaves the title
     * following the app's language, instead of freezing it at whatever it read
     * when the duration was changed.
     */
    const edit = profile.routineEdits?.[slot]?.[o.id];
    if (!edit) return o;
    return {
      ...o,
      title: edit.title ?? o.title,
      minutes: edit.minutes ?? o.minutes,
    };
  });
}

/**
 * The steps a slot's routine is actually made of, IN THE USER'S ORDER.
 *
 * Walking the id list rather than filtering the catalogue is the whole point:
 * filtering returns catalogue order, which silently discards the sequence the
 * user arranged, and the sequence is the feature.
 */
export function routineSteps(profile: Profile, slot: RoutineSlot): CustomRoutineStep[] {
  const all = routineCatalogue(profile, slot);
  const out: CustomRoutineStep[] = [];
  for (const id of profile.routines?.[slot] ?? []) {
    const hit = all.find((o) => o.id === id);
    // An id with no step behind it is a step deleted by a newer catalogue, or
    // a custom one lost to a failed write. Skipping it keeps the routine
    // usable instead of rendering a hole.
    if (hit) out.push(hit);
  }
  return out;
}

/**
 * Builds one slot's routine activity from the stored configuration.
 *
 * Shared by `applyRoutines` (onboarding) and `syncRoutines` (the routines
 * screen) so the two entry points cannot drift into producing different
 * activities from the same picks.
 */
function buildRoutine(profile: Profile, slot: RoutineSlot, date: string): Task | null {
  const parent = ROUTINE_PARENT[slot];
  const chosen = routineSteps(profile, slot);
  if (chosen.length === 0) return null;
  const id = routineTaskId(slot, date);
  return {
    id,
    title: routineParentTitle(slot),
    emoji: parent.emoji,
    tint: parent.tint,
    // The routine's length is the sum of its steps, so the day's planned total
    // stays honest instead of guessing a round number.
    minutes: chosen.reduce((n, o) => n + o.minutes, 0),
    slot,
    startMinutes: profile.routineTimes?.[slot] ?? parent.startMinutes,
    date,
    priority: 'todo',
    done: false,
    steps: chosen.map((o) => ({ id: `${id}-${o.id}`, title: o.title, done: false })),
    tag: 'selfCare',
  };
}

/**
 * Writes one slot's routine activity onto one date, carrying completion across.
 *
 * Pure, and shared by `syncRoutines` (an edit), `ensureToday` (the day turning
 * over) and the legacy cleanup in `applyRoutines`, so the three cannot drift
 * into producing different days from the same picks.
 *
 * Step ids are stable within a date, so the previous activity's `done` flags
 * are re-applied by id. A step just added arrives unticked, which is right; one
 * just removed takes its tick with it, which is also right. Ticks are only
 * carried from an activity on the SAME date — yesterday's are yesterday's.
 */
function writeRoutine(
  profile: Profile,
  tasks: Task[],
  slot: RoutineSlot,
  date: string,
  /**
   * `create` NEVER DELETES, and the distinction belongs here rather than in
   * the caller.
   *
   * An empty slot builds nothing, and what should happen then depends entirely
   * on who is asking. On the routines screen it is the user emptying a routine
   * on purpose and the activity should go. On the daily pass it would be an
   * unattended deletion of something nobody touched — the seeded "Evening
   * routine" disappearing from the starter day of anyone who configured a
   * morning and skipped the evening.
   *
   * `ensureToday` first expressed that by testing `routineSteps(...).length`
   * itself, which put the rule for "is this buildable" in two places; the day
   * it changes in one of them, the unattended deletion comes straight back.
   * The mode is a parameter so the decision stays next to the build.
   */
  mode: 'replace' | 'create' = 'replace'
): Task[] {
  const id = routineTaskId(slot, date);
  /**
   * THE UNDATED ID IS TREATED AS THIS DATE'S ACTIVITY TOO, AND NOT ONLY
   * BECAUSE THE MIGRATION MIGHT NOT HAVE RUN.
   *
   * Before routine ids were dated there was one activity per slot, under the
   * bare id. The v5 migration renames those onto the day they were written
   * for, which is the tidy path — and this file already argues, at length, on
   * `merge`, that a stored version number cannot be trusted to describe the
   * shape it labels: any install that has been on a beta, a TestFlight build
   * or a rolled-back release can report a version ahead of its own data.
   *
   * If that happens here the failure is visible and bad: today's copy is
   * appended beside an old one the lookup could not see, and the user opens
   * the app to TWO morning routines, one of which has their morning's ticks in
   * it. So the legacy id on this same date is matched, replaced and carried
   * across exactly as a dated one would be, and the migration becomes a
   * tidy-up rather than a correctness dependency.
   */
  const legacy = ROUTINE_PARENT[slot].id;
  const isThisDay = (t: Task) => t.id === id || (t.id === legacy && t.date === date);

  const was = tasks.find(isThisDay);
  const kept = tasks.filter((t) => !isThisDay(t));
  const next = buildRoutine(profile, slot, date);

  // An emptied slot removes THIS date's activity and leaves every other date's
  // alone — those are their own days' records, not stale copies of this one.
  // In `create` mode there is nothing to build and nothing to remove, so the
  // list is handed back untouched.
  if (!next) return mode === 'create' ? tasks : kept;

  if (was) {
    /**
     * Ticks are carried across by the step's OWN identity — the option id at
     * the end — rather than by the whole step id, which contains the task id
     * and therefore changes when the task id does. Keyed on the full id, an
     * upgrade in the middle of a morning would hand back every already-ticked
     * step as undone, which is the exact data loss this carry-over exists to
     * prevent.
     */
    const done = new Map(was.steps.map((st) => [stepKey(was.id, st.id), st.done]));
    next.steps = next.steps.map((st) => ({
      ...st,
      done: done.get(stepKey(next.id, st.id)) ?? false,
    }));
    // A routine is done when every step in it is, which can change just by
    // removing the one step that was still outstanding.
    next.done = next.steps.length > 0 && next.steps.every((st) => st.done);
  }

  return [...kept, next];
}

/** A routine step's identity independent of which day's activity carries it. */
function stepKey(taskId: string, stepId: string): string {
  return stepId.startsWith(`${taskId}-`) ? stepId.slice(taskId.length + 1) : stepId;
}

export const usePlanStore = create<PlanState>()(
  persist(
    (set, get) => ({
      tasks: seedTasks(),
      onboarded: false,
      profile: emptyProfile,
      focus: null,
      layout: 'compact',
      remindersRevokedAt: null,
      routinesBuiltFor: emptyBuilt(),

      addTask: (t) => {
        const id = newId();
        const slot: Slot =
          t.slot ?? (t.startMinutes != null ? slotForMinutes(t.startMinutes) : 'anytime');
        const task: Task = {
          id,
          title: t.title,
          emoji: t.emoji ?? '📌',
          tint: t.tint ?? 'lilac',
          minutes: t.minutes ?? 15,
          slot,
          startMinutes: t.startMinutes ?? null,
          date: t.date === undefined ? dateKey(new Date()) : t.date,
          priority: t.priority ?? 'todo',
          done: false,
          steps: t.steps ?? [],
          tag: t.tag ?? null,
        };
        set((s) => ({ tasks: [...s.tasks, task] }));
        return id;
      },

      updateTask: (id, patch) =>
        set((s) => ({
          tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)),
        })),

      removeTask: (id) => set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) })),

      toggleTask: (id) =>
        set((s) => ({
          tasks: s.tasks.map((t) => {
            if (t.id !== id) return t;
            const done = !t.done;
            // Completing a parent completes its steps; un-completing clears them,
            // so the "3/4" progress line can never contradict the checkbox.
            return { ...t, done, steps: t.steps.map((st) => ({ ...st, done })) };
          }),
        })),

      toggleStep: (taskId, stepId) =>
        set((s) => ({
          tasks: s.tasks.map((t) => {
            if (t.id !== taskId) return t;
            const steps = t.steps.map((st) =>
              st.id === stepId ? { ...st, done: !st.done } : st
            );
            // Last step checked rolls the parent up automatically.
            const allDone = steps.length > 0 && steps.every((st) => st.done);
            return { ...t, steps, done: allDone };
          }),
        })),

      addStep: (taskId, title) =>
        set((s) => ({
          tasks: s.tasks.map((t) =>
            t.id === taskId
              ? { ...t, steps: [...t.steps, { id: newId(), title, done: false }] }
              : t
          ),
        })),

      removeStep: (taskId, stepId) =>
        set((s) => ({
          tasks: s.tasks.map((t) =>
            t.id === taskId ? { ...t, steps: t.steps.filter((st) => st.id !== stepId) } : t
          ),
        })),

      moveTask: (id, date) =>
        set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? { ...t, date } : t)) })),

      setLayout: (layout) => set({ layout }),

      completeOnboarding: (p) =>
        set((s) => ({ onboarded: true, profile: { ...s.profile, ...p } })),

      /**
       * "Run onboarding again" is not "forget everything about me".
       *
       * The appearance choice and the reminder settings are DEVICE preferences,
       * not answers to onboarding's five questions — wiping them means a user
       * who re-runs the flow to change their routines is silently thrown back
       * into light mode with their reminders off, which reads as data loss.
       * Only what onboarding itself asks for is cleared.
       */
      resetOnboarding: () =>
        set((s) => ({
          onboarded: false,
          profile: {
            ...emptyProfile,
            appearance: s.profile.appearance,
            reminders: s.profile.reminders,
            reminderLead: s.profile.reminderLead,
          },
        })),

      /**
       * Turns the onboarding picks into real activities on today.
       *
       * Each slot collapses to ONE parent task whose steps are the picks, which
       * is the same nested-checklist row the rest of the app already uses — a
       * routine reads as one line when the day is calm and as four checkboxes
       * when it is not.
       *
       * It writes over the seeded routine for that slot rather than adding
       * beside it: the seed exists only so the app is never an empty grid, and
       * leaving it in place would show the user two "Morning routine" rows, one
       * of which they did not choose.
       */
      applyRoutines: (picks) =>
        set((s) => {
          const today = dateKey(new Date());
          const touched = ROUTINE_SLOTS.filter((slot) => picks[slot]?.length);
          if (touched.length === 0) return {};

          const profile = { ...s.profile, routines: { ...s.profile.routines, ...picks } };
          // The SEEDED routine for each touched slot goes, by its old undated
          // id. The seed exists only so the app is never an empty grid; leaving
          // it would show two "Morning routine" rows, one of them unchosen.
          const seeded = new Set(touched.map((slot) => ROUTINE_PARENT[slot].id));
          let tasks = s.tasks.filter((t) => !seeded.has(t.id));
          for (const slot of touched) tasks = writeRoutine(profile, tasks, slot, today);

          return {
            tasks,
            profile,
            routinesBuiltFor: {
              ...(s.routinesBuiltFor ?? emptyBuilt()),
              ...Object.fromEntries(touched.map((slot) => [slot, today])),
            } as Record<RoutineSlot, string | null>,
          };
        }),

      setAppearance: (appearance) =>
        set((s) => ({ profile: { ...s.profile, appearance } })),

      // Turning it on clears the revocation notice: whatever the OS said last
      // time, the user has just been asked again and has answered.
      setReminders: (reminders) =>
        set((s) => ({
          profile: { ...s.profile, reminders },
          remindersRevokedAt: reminders ? null : s.remindersRevokedAt,
        })),

      setReminderLead: (reminderLead) =>
        set((s) => ({ profile: { ...s.profile, reminderLead } })),

      toggleRoutineStep: (slot, stepId) =>
        set((s) => {
          const cur = s.profile.routines[slot] ?? [];
          // APPENDED, never spliced back into catalogue position. A step the
          // user adds belongs at the end of the sequence they have arranged;
          // dropping it into the middle because the catalogue lists it there
          // would silently rewrite their order.
          const next = cur.includes(stepId)
            ? cur.filter((x) => x !== stepId)
            : [...cur, stepId];
          return { profile: { ...s.profile, routines: { ...s.profile.routines, [slot]: next } } };
        }),

      moveRoutineStep: (slot, stepId, delta) =>
        set((s) => {
          const cur = [...(s.profile.routines[slot] ?? [])];
          const from = cur.indexOf(stepId);
          const to = from + delta;
          if (from < 0 || to < 0 || to >= cur.length) return {};
          cur.splice(to, 0, ...cur.splice(from, 1));
          return { profile: { ...s.profile, routines: { ...s.profile.routines, [slot]: cur } } };
        }),

      addRoutineStep: (slot, step) =>
        set((s) => {
          const id = `custom-${newId()}`;
          const custom = s.profile.routineCustom ?? emptyCustom();
          return {
            profile: {
              ...s.profile,
              routineCustom: { ...custom, [slot]: [...(custom[slot] ?? []), { ...step, id }] },
              routines: { ...s.profile.routines, [slot]: [...(s.profile.routines[slot] ?? []), id] },
            },
          };
        }),

      /**
       * EDITING A STEP, whichever kind of step it is.
       *
       * Catalogue steps and the user's own behave identically here — one
       * overlay keyed by id covers both — which is what lets the routines
       * screen offer a single "tap a step to change it" affordance instead of
       * one gesture for the twelve built-in steps and another for the ones you
       * typed. See `RoutineStepEdit` for why this is an overlay rather than a
       * rewrite of the step itself.
       *
       * An empty title is dropped rather than stored: a nameless step is not a
       * thing the rest of the app can render, and "I cleared the field" reads
       * as a cancel, not as a request for a blank row.
       */
      editRoutineStep: (slot, stepId, patch) =>
        set((s) => {
          const edits = s.profile.routineEdits ?? emptyEdits();
          const title = patch.title?.trim();
          const next: RoutineStepEdit = {
            ...(edits[slot]?.[stepId] ?? {}),
            ...(title ? { title } : {}),
            ...(patch.minutes != null ? { minutes: patch.minutes } : {}),
          };
          return {
            profile: {
              ...s.profile,
              routineEdits: { ...edits, [slot]: { ...(edits[slot] ?? {}), [stepId]: next } },
            },
          };
        }),

      resetRoutineStep: (slot, stepId) =>
        set((s) => {
          const edits = s.profile.routineEdits ?? emptyEdits();
          const forSlot = { ...(edits[slot] ?? {}) };
          if (!(stepId in forSlot)) return {};
          delete forSlot[stepId];
          return {
            profile: { ...s.profile, routineEdits: { ...edits, [slot]: forSlot } },
          };
        }),

      setRoutineTime: (slot, startMinutes) =>
        set((s) => ({
          profile: {
            ...s.profile,
            routineTimes: { ...(s.profile.routineTimes ?? defaultTimes()), [slot]: startMinutes },
          },
        })),

      /**
       * Rebuilds today's routine activities from the stored configuration.
       *
       * ── IT CARRIES COMPLETION ACROSS ────────────────────────────────────
       * The naive version replaces the activity outright, which is correct for
       * onboarding — there is nothing to lose — and destructive here, because
       * the routines screen is reachable at eleven in the morning from a day
       * whose first three steps are already ticked. Rebuilding would hand them
       * back unticked, and the user would read that as the app having lost
       * their morning.
       *
       * Step ids are stable (`seed-morning-teeth-am`), so the previous
       * activity's `done` flags are looked up by id and re-applied. A step that
       * was just added arrives unticked, which is right; one that was removed
       * takes its tick with it, which is also right.
       */
      syncRoutines: (slot) =>
        set((s) => {
          const today = dateKey(new Date());
          /**
           * ONE SLOT, NOT ALL THREE — and this is a data-loss fix, not tidiness.
           *
           * This rebuilt every slot on every edit, and an empty slot builds
           * nothing, so any slot the user had not configured had its activity
           * DELETED. Editing only the morning therefore silently removed the
           * seeded "Evening routine" from the day: the task count went from
           * eight to seven and nothing said why.
           *
           * The trap is that a routine activity is an ORDINARY TASK once it
           * exists. The user can rename it, add steps to it, tick it off — and
           * a slot they have never opened is not "an empty routine to be
           * cleaned up", it is just a task they have. Only the slot actually
           * being edited may be rebuilt, and emptying that slot on purpose is
           * still the way to remove its activity.
           *
           * Editing a routine also counts as having handled today, so the
           * rebuild below is not undone by the next `ensureToday`.
           */
          return {
            tasks: writeRoutine(s.profile, s.tasks, slot, today),
            routinesBuiltFor: {
              ...(s.routinesBuiltFor ?? emptyBuilt()),
              [slot]: today,
            } as Record<RoutineSlot, string | null>,
          };
        }),

      /**
       * TODAY'S ROUTINES, BUILT ONCE A DAY.
       *
       * ── THE BUG THIS FIXES ─────────────────────────────────────────────
       * A routine used to be written onto the day it was configured and never
       * again. `applyRoutines` stamped it at the end of onboarding and
       * `syncRoutines` re-stamped it whenever the routines screen was edited,
       * and nothing else ever built one — so the morning routine someone set
       * up on Monday was on Monday's plan, and Tuesday opened to an empty day
       * with a dozing dog on it. The whole promise of the feature ("we keep
       * the order so you do not have to") lasted exactly one day, and the app
       * looked broken in the most demoralising way available to a planner:
       * blank, every morning, for someone who had already told it what their
       * mornings look like.
       *
       * ── WHY IT IS GATED ON A DATE AND NOT ON "IS IT THERE?" ────────────
       * Rebuilding whenever today's activity is missing would make a routine
       * impossible to delete: remove it at nine in the morning because today
       * is not a normal day, and the next foreground puts it straight back.
       * `routinesBuiltFor` records that this slot has had its turn today, so
       * a deliberate deletion survives until tomorrow — which is when a daily
       * routine is supposed to come back anyway.
       */
      ensureToday: () =>
        set((s) => {
          const today = dateKey(new Date());
          const built = s.routinesBuiltFor ?? emptyBuilt();
          const pending = ROUTINE_SLOTS.filter((slot) => built[slot] !== today);
          if (pending.length === 0) return {};

          /**
           * `'create'` — IT BUILDS, IT NEVER DELETES. A slot with nothing in
           * it has nothing to contribute, and an unattended daily pass must
           * not read that as permission to remove the activity sitting there;
           * see the note on `writeRoutine`'s `mode`. Every pending slot is
           * still marked as handled for today, because there is nothing more
           * this pass can do for it either way.
           */
          let tasks = s.tasks;
          for (const slot of pending) {
            tasks = writeRoutine(s.profile, tasks, slot, today, 'create');
          }

          return {
            tasks,
            routinesBuiltFor: {
              ...built,
              ...Object.fromEntries(pending.map((slot) => [slot, today])),
            } as Record<RoutineSlot, string | null>,
          };
        }),

      /**
       * Brings yesterday's unfinished work forward.
       *
       * ── ROUTINES ARE EXCLUDED, AND THAT IS NOT AN OVERSIGHT ────────────
       * A routine belongs to its own day and today already has its own copy,
       * so moving yesterday's half-finished morning onto today would put two
       * morning routines on one day. An ordinary activity has no such copy —
       * it exists once, and if it did not happen yesterday it is still
       * outstanding, which is exactly what carrying it over says.
       */
      carryOver: (date) =>
        set((s) => {
          const moving = new Set(
            s.tasks
              .filter((t) => t.date != null && t.date < date && !t.done && !isRoutineTask(t.id))
              .map((t) => t.id)
          );
          if (moving.size === 0) return {};
          return {
            tasks: s.tasks.map((t) => (moving.has(t.id) ? { ...t, date } : t)),
          };
        }),

      startFocus: (totalSeconds, taskId = null) =>
        set({
          focus: {
            taskId,
            totalSeconds,
            remainingSeconds: totalSeconds,
            startedAt: Date.now(),
          },
        }),

      pauseFocus: () => {
        const f = get().focus;
        if (!f || f.startedAt == null) return;
        const elapsed = (Date.now() - f.startedAt) / 1000;
        set({
          focus: {
            ...f,
            remainingSeconds: Math.max(0, f.remainingSeconds - elapsed),
            startedAt: null,
          },
        });
      },

      resumeFocus: () => {
        const f = get().focus;
        if (!f || f.startedAt != null) return;
        set({ focus: { ...f, startedAt: Date.now() } });
      },

      extendFocus: (seconds) => {
        const f = get().focus;
        if (!f) return;
        set({
          focus: {
            ...f,
            totalSeconds: f.totalSeconds + seconds,
            remainingSeconds: f.remainingSeconds + seconds,
          },
        });
      },

      endFocus: () => set({ focus: null }),

      reconcileFocus: () => {
        const f = get().focus;
        // A PAUSED session is not stale, however old: pausing is a deliberate
        // "hold this for me", and its remaining time does not decay.
        if (!f || f.startedAt == null) return;
        const deadline = f.startedAt + f.remainingSeconds * 1000;
        if (Date.now() - deadline > FOCUS_STALE_MS) set({ focus: null });
      },
    }),
    {
      name: 'oneplan-v1',
      storage: createJSONStorage(() => mmkvStorage),
      /**
       * v2 shrank the tint palette from eight hues to six, because the eight
       * included pairs only deltaE ~8 apart — indistinguishable, which defeats
       * the point of encoding category as colour. Tasks saved under the retired
       * names are remapped here; without this they render an undefined swatch.
       */
      version: 5,
      migrate: (persisted: unknown, from: number) => {
        const state = persisted as
          | {
              tasks?: Array<{
                tint?: string;
                id?: string;
                date?: string | null;
                steps?: Array<{ id?: string }>;
              }>;
              profile?: Partial<Profile>;
            }
          | undefined;
        if (!state) return state as never;
        /**
         * A MISSING OR MALFORMED VERSION MEANS "OLDEST", NOT "NEWEST".
         *
         * `from` arrives as whatever was stored beside the state, and a blob
         * written without one hands this `undefined` — at which point every
         * `from < n` below is false and the whole migration is skipped
         * silently, on exactly the damaged store that most needs it. Comparing
         * from 0 instead makes the untrustworthy case the conservative one.
         */
        const fromVersion = typeof from === 'number' && Number.isFinite(from) ? from : 0;
        if (fromVersion < 2 && Array.isArray(state.tasks)) {
          const RETIRED: Record<string, string> = { sage: 'sky', clay: 'rose', teal: 'mint' };
          state.tasks = state.tasks.map((t) =>
            t && typeof t.tint === 'string' && RETIRED[t.tint]
              ? { ...t, tint: RETIRED[t.tint] }
              : t
          );
        }
        /**
         * v3 and v4 both ADDED keys to the profile rather than transforming
         * anything, so neither needs a block here. Missing keys are filled in
         * by `merge` below, on every rehydration rather than only when the
         * version happens to change — see the note there for why that
         * distinction turned out to matter.
         */
        /**
         * v5 DATES a routine activity's id, which is what lets a routine
         * repeat — see `routineTaskId`. An existing install holds exactly one
         * activity per slot under the bare id, so it is renamed onto the day
         * it was actually written for. Without this the old row would keep the
         * undated id forever: `writeRoutine` would never find it, so today's
         * copy would be appended beside it and the user would see two morning
         * routines on the day they upgraded.
         *
         * Step ids are prefixed with the task id, so they move with it. Ones
         * that are not (the seeded `s1`…`s4`) are left exactly as they are —
         * they are already unique within their task, which is the only place
         * a step id has to be unique.
         */
        if (fromVersion < 5 && Array.isArray(state.tasks)) {
          const LEGACY = new Set(['seed-morning', 'seed-afternoon', 'seed-evening']);
          state.tasks = state.tasks.map((t) => {
            if (!t || typeof t.id !== 'string' || !LEGACY.has(t.id)) return t;
            // An undated routine activity has no day to belong to, so there is
            // nothing to rename it to. Left alone, it is simply an ordinary
            // task, which is what an activity with no date already is here.
            if (typeof t.date !== 'string') return t;
            const was = t.id;
            const id = `${was}:${t.date}`;
            return {
              ...t,
              id,
              steps: Array.isArray(t.steps)
                ? t.steps.map((st) =>
                    typeof st?.id === 'string' && st.id.startsWith(`${was}-`)
                      ? { ...st, id: `${id}-${st.id.slice(was.length + 1)}` }
                      : st
                  )
                : t.steps,
            };
          });
        }
        return state as never;
      },

      /**
       * ── WHY THE DEFAULTS LIVE HERE AND NOT IN `migrate` ────────────────────
       * `migrate` only runs when the stored version DIFFERS from the current
       * one. `merge` runs on every single rehydration, and that difference is
       * the whole reason this exists.
       *
       * The bug it fixes: the appearance picker shipped with nothing selected,
       * because `profile.appearance` was `undefined` on a store that already
       * reported version 4 — written by an earlier development build whose
       * shape was different. `migrate` was never called, so the version-gated
       * backfill inside it never ran, and the version number confidently said
       * the migration had already happened. Any install that has been on a
       * beta, a TestFlight build, or a release that was later rolled back can
       * present a version that is ahead of its own shape.
       *
       * The underlying hazard is older than that and is called out twice in
       * this file already: zustand's default merge is SHALLOW, so a persisted
       * `profile` REPLACES the default profile wholesale and every key added
       * since it was written arrives as `undefined`. Patching that one key at a
       * time, in a versioned block, means the next key added has to remember to
       * do it again.
       *
       * Spreading the current profile underneath the persisted one fixes the
       * whole class: a key the user has saved wins, and a key they have never
       * had falls back to the default. Transformations stay versioned in
       * `migrate` — remapping a retired tint twice would be wrong — and
       * DEFAULTS are simply always applied.
       */
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<PlanState>;
        return {
          ...current,
          ...p,
          profile: { ...current.profile, ...(p.profile ?? {}) },
        };
      },

      partialize: (s) => ({
        tasks: s.tasks,
        onboarded: s.onboarded,
        profile: s.profile,
        focus: s.focus,
        layout: s.layout,
        remindersRevokedAt: s.remindersRevokedAt,
        routinesBuiltFor: s.routinesBuiltFor,
      }),
    }
  )
);

/** Live remaining seconds, derived from the absolute deadline. */
export function remainingFor(f: FocusSession | null): number {
  if (!f) return 0;
  if (f.startedAt == null) return Math.max(0, f.remainingSeconds);
  const elapsed = (Date.now() - f.startedAt) / 1000;
  return Math.max(0, f.remainingSeconds - elapsed);
}

// ---- selectors -------------------------------------------------------------

export const PRIORITY_ORDER: Priority[] = ['high', 'medium', 'low', 'todo'];

export function tasksForDate(tasks: Task[], key: string): Task[] {
  return tasks.filter((t) => t.date === key);
}

export function inboxTasks(tasks: Task[]): Task[] {
  return tasks.filter((t) => t.date === null);
}

export function bySlot(tasks: Task[], slot: Slot): Task[] {
  return tasks
    .filter((t) => t.slot === slot)
    .sort((a, b) => {
      if (a.startMinutes == null && b.startMinutes == null) return 0;
      if (a.startMinutes == null) return 1;
      if (b.startMinutes == null) return -1;
      return a.startMinutes - b.startMinutes;
    });
}

export function stepProgress(t: Task): { done: number; total: number } {
  return { done: t.steps.filter((s) => s.done).length, total: t.steps.length };
}
