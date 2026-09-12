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

export type Profile = {
  name: string;
  need: string | null;
  rhythm: string | null;
  reminders: boolean;
};
