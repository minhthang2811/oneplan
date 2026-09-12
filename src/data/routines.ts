import type { TintName } from '../theme/tokens';
import type { Slot } from '../lib/time';

export type RoutineOption = {
  id: string;
  title: string;
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
 */
export const ROUTINES: Record<Exclude<Slot, 'anytime'>, RoutineOption[]> = {
  morning: [
    { id: 'wake', title: 'Wake up', emoji: '⏰', minutes: 5 },
    { id: 'water-am', title: 'Drink water', emoji: '💧', minutes: 2 },
    { id: 'bed', title: 'Make bed', emoji: '🛏️', minutes: 3 },
    { id: 'teeth-am', title: 'Brush teeth', emoji: '🪥', minutes: 3 },
    { id: 'shower', title: 'Shower', emoji: '🚿', minutes: 10 },
    { id: 'dressed', title: 'Get dressed', emoji: '👕', minutes: 8 },
    { id: 'meds-am', title: 'Take meds', emoji: '💊', minutes: 2 },
    { id: 'breakfast', title: 'Breakfast', emoji: '🥣', minutes: 15 },
    { id: 'coffee', title: 'Have coffee', emoji: '☕️', minutes: 10 },
    { id: 'plan', title: 'Plan your day', emoji: '📝', minutes: 10 },
    { id: 'stretch-am', title: 'Stretch', emoji: '🧘', minutes: 8 },
    { id: 'commute', title: 'Commute', emoji: '🚌', minutes: 20 },
  ],
  afternoon: [
    { id: 'lunch', title: 'Lunch', emoji: '🥪', minutes: 20 },
    { id: 'walk', title: 'Walk outside', emoji: '🚶', minutes: 15 },
    { id: 'water-pm', title: 'Drink water', emoji: '💧', minutes: 2 },
    { id: 'deep-work', title: 'Deep work', emoji: '💻', minutes: 20 },
    { id: 'email', title: 'Check email', emoji: '✉️', minutes: 15 },
    { id: 'snack', title: 'Snack', emoji: '🍎', minutes: 5 },
    { id: 'desk', title: 'Tidy desk', emoji: '🧹', minutes: 10 },
    { id: 'move', title: 'Move your body', emoji: '🏃', minutes: 20 },
    { id: 'errands', title: 'Errands', emoji: '🛒', minutes: 20 },
    { id: 'breathe', title: 'Take a breather', emoji: '🌤️', minutes: 5 },
    { id: 'call', title: 'Call someone', emoji: '📞', minutes: 15 },
    { id: 'review', title: 'Review the day', emoji: '🔎', minutes: 10 },
  ],
  evening: [
    { id: 'dinner', title: 'Dinner', emoji: '🍝', minutes: 20 },
    { id: 'tidy', title: 'Tidy up', emoji: '🧺', minutes: 15 },
    { id: 'dishes', title: 'Do the dishes', emoji: '🍽️', minutes: 10 },
    { id: 'teeth-pm', title: 'Brush teeth', emoji: '🪥', minutes: 3 },
    { id: 'skincare', title: 'Skincare', emoji: '🧴', minutes: 5 },
    { id: 'meds-pm', title: 'Take meds', emoji: '💊', minutes: 2 },
    { id: 'read', title: 'Read a chapter', emoji: '📚', minutes: 20 },
    { id: 'journal', title: 'Journal', emoji: '🕯️', minutes: 10 },
    { id: 'clothes', title: 'Lay out clothes', emoji: '👖', minutes: 5 },
    { id: 'screens', title: 'Screens off', emoji: '🌙', minutes: 5 },
    { id: 'alarm', title: 'Set an alarm', emoji: '⏱️', minutes: 2 },
    { id: 'wind-down', title: 'Wind down', emoji: '🛋️', minutes: 15 },
  ],
};

export type RoutineSlot = keyof typeof ROUTINES;

export const ROUTINE_SLOTS: RoutineSlot[] = ['morning', 'afternoon', 'evening'];

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
  { id: string; title: string; emoji: string; tint: TintName; startMinutes: number }
> = {
  morning: { id: 'seed-morning', title: 'Morning routine', emoji: '🌅', tint: 'peach', startMinutes: 8 * 60 },
  afternoon: { id: 'seed-afternoon', title: 'Afternoon reset', emoji: '☀️', tint: 'butter', startMinutes: 13 * 60 },
  evening: { id: 'seed-evening', title: 'Evening routine', emoji: '🌙', tint: 'sky', startMinutes: 20 * 60 },
};

/** Copy for the picker, per slot. One question at a time. */
export const ROUTINE_COPY: Record<RoutineSlot, { title: string; subtitle: string }> = {
  morning: {
    title: 'How does a\ngood morning go?',
    subtitle: 'Pick the things you already do. We will keep them in this order so you do not have to.',
  },
  afternoon: {
    title: 'What keeps the\nafternoon moving?',
    subtitle: 'The middle of the day is where plans quietly fall apart. A couple of anchors is plenty.',
  },
  evening: {
    title: 'How does the\nday wind down?',
    subtitle: 'Evenings run on autopilot until they do not. Pick what you want the plan to remember.',
  },
};
