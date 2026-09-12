import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { mmkvStorage } from './storage';
import type { Task, Step, FocusSession, Profile, Priority } from './types';
import { seedTasks } from '../data/seed';
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

  startFocus: (totalSeconds: number, taskId?: string | null) => void;
  pauseFocus: () => void;
  resumeFocus: () => void;
  extendFocus: (seconds: number) => void;
  endFocus: () => void;
}

const emptyProfile: Profile = { name: '', need: null, rhythm: null, reminders: false };

export const usePlanStore = create<PlanState>()(
  persist(
    (set, get) => ({
      tasks: seedTasks(),
      onboarded: false,
      profile: emptyProfile,
      focus: null,
      layout: 'compact',

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

      resetOnboarding: () => set({ onboarded: false, profile: emptyProfile }),

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
      version: 2,
      migrate: (persisted: unknown, from: number) => {
        const state = persisted as { tasks?: Array<{ tint?: string }> } | undefined;
        if (!state) return state as never;
        if (from < 2 && Array.isArray(state.tasks)) {
          const RETIRED: Record<string, string> = { sage: 'sky', clay: 'rose', teal: 'mint' };
          state.tasks = state.tasks.map((t) =>
            t && typeof t.tint === 'string' && RETIRED[t.tint]
              ? { ...t, tint: RETIRED[t.tint] }
              : t
          );
        }
        return state as never;
      },
      partialize: (s) => ({
        tasks: s.tasks,
        onboarded: s.onboarded,
        profile: s.profile,
        focus: s.focus,
        layout: s.layout,
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
