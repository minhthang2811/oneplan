import type { TintName } from '../theme/tokens';
import type { Slot } from '../lib/time';

export type Priority = 'high' | 'medium' | 'low' | 'todo';

export type Step = { id: string; title: string; done: boolean };

export type Task = {
  id: string;
  title: string;
  emoji: string;
  tint: TintName;
  /** Planned duration in minutes. */
  minutes: number;
  slot: Slot;
  /** Minutes from midnight. null = unscheduled within its slot. */
  startMinutes: number | null;
  /** YYYY-MM-DD, or null when the task lives in the To-do inbox. */
  date: string | null;
  priority: Priority;
  done: boolean;
  steps: Step[];
  tag: string | null;
};

export type FocusSession = {
  taskId: string | null;
  totalSeconds: number;
  /** Authoritative remaining time when paused. */
  remainingSeconds: number;
  /** Epoch ms the current run began; null while paused. */
  startedAt: number | null;
};

/** Which palette the user asked for, which is not the same as what is on screen. */
export type AppearancePref = 'system' | 'light' | 'dark';

export type RoutineSlotKey = Exclude<Slot, 'anytime'>;

/**
 * A step the user wrote themselves, rather than picked from the catalogue.
 *
 * Shaped exactly like a `RoutineOption` so the routines screen can lay a
 * slot's catalogue options and its custom ones out in one list without
 * branching on which kind each is.
 */
export type CustomRoutineStep = {
  id: string;
  title: string;
  emoji: string;
  minutes: number;
};

export type Profile = {
  name: string;
  need: string | null;
  rhythm: string | null;
  reminders: boolean;
  /**
   * How many minutes BEFORE an activity starts its reminder fires.
   *
   * 0 is "as it starts", which is what this shipped with and is the one value
   * that cannot actually help: a nudge that arrives at the moment you were
   * supposed to have begun is a notification about being late. Everything else
   * here is lead time, which is the thing a reminder is for.
   */
  reminderLead: number;
  /**
   * Routine step ids per time-of-day, IN THE ORDER THEY HAPPEN.
   *
   * The order is content, not presentation. The whole promise of the routines
   * flow is "we will keep them in this order so you do not have to", so this
   * array is the sequence itself and the routine is built by walking it —
   * never by filtering the catalogue, which would silently re-impose the
   * catalogue's order on the user's.
   *
   * Kept alongside the tasks it generated, because the tasks are editable: once
   * someone renames or deletes a step, the task can no longer tell us what was
   * originally chosen, and "Me" needs that to show the routine back to them.
   */
  routines: Record<RoutineSlotKey, string[]>;
  /** When each routine starts, minutes from midnight. Overrides the default. */
  routineTimes: Record<RoutineSlotKey, number>;
  /** Steps the user added themselves. Their ids appear in `routines` too. */
  routineCustom: Record<RoutineSlotKey, CustomRoutineStep[]>;
  appearance: AppearancePref;
};
