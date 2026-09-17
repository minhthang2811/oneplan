import type { TintName } from '../theme/tokens';
import type { Slot } from '../lib/time';
import { translate, type TKey } from '../i18n';

export type RoutineOption = {
  id: string;
  emoji: string;
  minutes: number;
};

/**
 * The routine catalogue offered during onboarding.
 *
 * These are deliberately *small, concrete, already-happening* actions rather
 * than goals ("Drink water", not "Hydrate more"). Someone who cannot start a
 * day does not need a new commitment — they need the things they already do
 * written down in an order, so the plan carries the sequence instead of their
 * working memory.
 *
 * Every entry is <= 20 minutes. A first plan made of twelve half-hour blocks is
 * a plan that gets abandoned before lunch.
 *
 * The TITLE is not stored here. Each `id` is also its translation key
 * (`routine.<id>` in the catalogues), so the words live with every other
 * translatable string instead of half of them being stranded in a data file.
 * The ids themselves are stable and never translated — they are what a saved
 * pick in `profile.routines` refers to.
 */
export const ROUTINES: Record<Exclude<Slot, 'anytime'>, RoutineOption[]> = {
  morning: [
    { id: 'wake', emoji: '⏰', minutes: 5 },
    { id: 'water-am', emoji: '💧', minutes: 2 },
    { id: 'bed', emoji: '🛏️', minutes: 3 },
    { id: 'teeth-am', emoji: '🪥', minutes: 3 },
    { id: 'shower', emoji: '🚿', minutes: 10 },
    { id: 'dressed', emoji: '👕', minutes: 8 },
    { id: 'meds-am', emoji: '💊', minutes: 2 },
    { id: 'breakfast', emoji: '🥣', minutes: 15 },
    { id: 'coffee', emoji: '☕️', minutes: 10 },
    { id: 'plan', emoji: '📝', minutes: 10 },
    { id: 'stretch-am', emoji: '🧘', minutes: 8 },
    { id: 'commute', emoji: '🚌', minutes: 20 },
  ],
  afternoon: [
    { id: 'lunch', emoji: '🥪', minutes: 20 },
    { id: 'walk', emoji: '🚶', minutes: 15 },
    { id: 'water-pm', emoji: '💧', minutes: 2 },
    { id: 'deep-work', emoji: '💻', minutes: 20 },
    { id: 'email', emoji: '✉️', minutes: 15 },
    { id: 'snack', emoji: '🍎', minutes: 5 },
    { id: 'desk', emoji: '🧹', minutes: 10 },
    { id: 'move', emoji: '🏃', minutes: 20 },
    { id: 'errands', emoji: '🛒', minutes: 20 },
    { id: 'breathe', emoji: '🌤️', minutes: 5 },
    { id: 'call', emoji: '📞', minutes: 15 },
    { id: 'review', emoji: '🔎', minutes: 10 },
  ],
  evening: [
    { id: 'dinner', emoji: '🍝', minutes: 20 },
    { id: 'tidy', emoji: '🧺', minutes: 15 },
    { id: 'dishes', emoji: '🍽️', minutes: 10 },
    { id: 'teeth-pm', emoji: '🪥', minutes: 3 },
    { id: 'skincare', emoji: '🧴', minutes: 5 },
    { id: 'meds-pm', emoji: '💊', minutes: 2 },
    { id: 'read', emoji: '📚', minutes: 20 },
    { id: 'journal', emoji: '🕯️', minutes: 10 },
    { id: 'clothes', emoji: '👖', minutes: 5 },
    { id: 'screens', emoji: '🌙', minutes: 5 },
    { id: 'alarm', emoji: '⏱️', minutes: 2 },
    { id: 'wind-down', emoji: '🛋️', minutes: 15 },
  ],
};

export type RoutineSlot = keyof typeof ROUTINES;

export const ROUTINE_SLOTS: RoutineSlot[] = ['morning', 'afternoon', 'evening'];

/** The visible name of a routine option, in the language in effect. */
export function routineTitle(id: string): string {
  return translate(`routine.${id}` as TKey);
}

/**
 * How each slot's picks are rolled up into a single parent activity.
 *
 * One task with steps, not N loose tasks: a routine is ONE thing on the day
 * when you are calm and four checkboxes when you are stuck, which is the whole
 * point of the nested-checklist row. Twelve separate rows would bury the rest
 * of the day.
 */
export const ROUTINE_PARENT: Record<
  RoutineSlot,
  { id: string; emoji: string; tint: TintName; startMinutes: number }
> = {
  morning: { id: 'seed-morning', emoji: '🌅', tint: 'peach', startMinutes: 8 * 60 },
  afternoon: { id: 'seed-afternoon', emoji: '☀️', tint: 'butter', startMinutes: 13 * 60 },
  evening: { id: 'seed-evening', emoji: '🌙', tint: 'sky', startMinutes: 20 * 60 },
};

export function routineParentTitle(slot: RoutineSlot): string {
  return translate(`routineParent.${slot}` as TKey);
}

/**
 * A routine activity's id, WHICH IS PER-DATE.
 *
 * It used to be the bare slot id (`seed-morning`), one task for all time. That
 * is what made the routine impossible to repeat: a routine activity is an
 * ordinary, editable, tickable task once it exists, so a second day's copy
 * would need a second id — and with only one available, building today's
 * morning necessarily destroyed yesterday's, ticks and all. The app avoided
 * the data loss by never building a second day at all, which is why a routine
 * appeared on the day it was configured and never again.
 *
 * Dating the id gives every day its own record. Yesterday's finished morning
 * stays finished, today's arrives fresh, and paging back through the week
 * shows what actually happened rather than one row that moves.
 */
export function routineTaskId(slot: RoutineSlot, date: string): string {
  return `${ROUTINE_PARENT[slot].id}:${date}`;
}

/** The ids routine activities were written under before they were dated. */
const LEGACY_IDS = new Set(ROUTINE_SLOTS.map((slot) => ROUTINE_PARENT[slot].id));

/**
 * Whether a task is one of the generated routine activities.
 *
 * Carry-over asks this: a routine belongs to its own day and today already has
 * its own copy, so dragging yesterday's unfinished morning onto today would put
 * two morning routines on one day.
 */
export function isRoutineTask(id: string): boolean {
  return LEGACY_IDS.has(id) || LEGACY_IDS.has(id.split(':')[0]);
}

/** Copy for the picker, per slot. One question at a time. */
export const ROUTINE_COPY: Record<RoutineSlot, { title: TKey; subtitle: TKey }> = {
  morning: {
    title: 'onboarding.routinesMorningTitle',
    subtitle: 'onboarding.routinesMorningSubtitle',
  },
  afternoon: {
    title: 'onboarding.routinesAfternoonTitle',
    subtitle: 'onboarding.routinesAfternoonSubtitle',
  },
  evening: {
    title: 'onboarding.routinesEveningTitle',
    subtitle: 'onboarding.routinesEveningSubtitle',
  },
};
