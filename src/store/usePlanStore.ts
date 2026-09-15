import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { mmkvStorage } from './storage';
import type {
  Task, FocusSession, Profile, Priority, AppearancePref, CustomRoutineStep,
} from './types';
import { seedTasks } from '../data/seed';
import { ROUTINES, ROUTINE_PARENT, ROUTINE_SLOTS, type RoutineSlot } from '../data/routines';
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
  setRoutineTime: (slot: RoutineSlot, startMinutes: number) => void;
  /** Rebuilds ONE slot's routine activity on today from the stored config. */
  syncRoutines: (slot: RoutineSlot) => void;

  startFocus: (totalSeconds: number, taskId?: string | null) => void;
  pauseFocus: () => void;
  resumeFocus: () => void;
  extendFocus: (seconds: number) => void;
  endFocus: () => void;
}

const emptyRoutines = (): Profile['routines'] => ({ morning: [], afternoon: [], evening: [] });
const emptyCustom = (): Profile['routineCustom'] => ({ morning: [], afternoon: [], evening: [] });
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
  return [...ROUTINES[slot], ...(profile.routineCustom?.[slot] ?? [])];
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
  return {
    id: parent.id,
    title: parent.title,
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
    steps: chosen.map((o) => ({ id: `${parent.id}-${o.id}`, title: o.title, done: false })),
    tag: 'Self care',
  };
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
          const replacedIds = new Set(touched.map((slot) => ROUTINE_PARENT[slot].id));
          const kept = s.tasks.filter((t) => !replacedIds.has(t.id));
          const built = touched
            .map((slot) => buildRoutine(profile, slot, today))
            .filter((t): t is Task => t != null);

          return { tasks: [...kept, ...built], profile };
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
          const id = ROUTINE_PARENT[slot].id;
          const was = s.tasks.find((t) => t.id === id);

          /**
           * ONE SLOT, NOT ALL THREE — and this is a data-loss fix, not tidiness.
           *
           * This rebuilt every slot on every edit, and `buildRoutine` returns
           * null for a slot with no steps, so any slot the user had not
           * configured had its activity DELETED. Editing only the morning
           * therefore silently removed the seeded "Evening routine" from the
           * day: the task count went from eight to seven and nothing said why.
           *
           * The trap is that a routine activity is an ORDINARY TASK once it
           * exists. The user can rename it, add steps to it, tick it off — and
           * a slot they have never opened is not "an empty routine to be
           * cleaned up", it is just a task they have. Only the slot actually
           * being edited may be rebuilt, and emptying that slot on purpose is
           * still the way to remove its activity.
           */
          const next = buildRoutine(s.profile, slot, today);
          const kept = s.tasks.filter((t) => t.id !== id);

          /**
           * EMPTYING A SLOT REMOVES TODAY'S ACTIVITY, AND ONLY TODAY'S.
           *
           * The delete used to filter by id alone, with no date check — the
           * guard that protects completion state three lines down had no
           * equivalent here. So removing the last step from the morning
           * routine deleted the morning activity even when it was dated
           * yesterday and carried yesterday's ticks: a record of a finished
           * day, destroyed by an edit to a future one.
           *
           * A routine activity on another date is that date's record, not a
           * stale copy of this one. It is left alone, and the slot simply has
           * nothing on today.
           */
          if (!next) return was && was.date !== today ? {} : { tasks: kept };

          // Yesterday's ticks are yesterday's. Progress is only carried across
          // when the activity being replaced is the one on screen.
          if (was && was.date === today) {
            const doneById = new Map(was.steps.map((st) => [st.id, st.done]));
            next.steps = next.steps.map((st) => ({ ...st, done: doneById.get(st.id) ?? false }));
            // A routine is done when every step in it is, which can change just
            // by removing the one step that was still outstanding.
            next.done = next.steps.length > 0 && next.steps.every((st) => st.done);
          }

          /**
           * Replaced BY ID. A routine's id is fixed per slot (`seed-morning`),
           * so keeping an existing one dated yesterday while appending today's
           * would put two tasks with the same id in the list — a duplicate
           * React key, and a selector that returns whichever it reaches first.
           */
          return { tasks: [...kept, next] };
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
      version: 4,
      migrate: (persisted: unknown, from: number) => {
        const state = persisted as
          | { tasks?: Array<{ tint?: string }>; profile?: Partial<Profile> }
          | undefined;
        if (!state) return state as never;
        if (from < 2 && Array.isArray(state.tasks)) {
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
