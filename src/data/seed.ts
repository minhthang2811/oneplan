import type { Task } from '../store/types';
import { dateKey } from '../lib/time';

const uid = (n: string) => `seed-${n}`;

const step = (id: string, title: string, done = false) => ({ id, title, done });

/** A believable first day, so the app is never an empty grid on launch. */
export function seedTasks(): Task[] {
  const today = dateKey(new Date());
  return [
    {
      id: uid('plan'), title: 'Plan your day', emoji: '📝', tint: 'butter',
      minutes: 10, slot: 'morning', startMinutes: 8 * 60, date: today,
      priority: 'todo', done: false, steps: [], tag: 'Admin',
    },
    {
      id: uid('morning'), title: 'Morning routine', emoji: '🌅', tint: 'peach',
      minutes: 30, slot: 'morning', startMinutes: 8 * 60 + 10, date: today,
      priority: 'todo', done: false, tag: 'Self care',
      steps: [
        step('s1', 'Wake up'),
        step('s2', 'Brush teeth'),
        step('s3', 'Breakfast'),
        step('s4', 'Have coffee'),
      ],
    },
    {
      id: uid('tidy'), title: 'Quick tidy', emoji: '🧹', tint: 'lilac',
      minutes: 5, slot: 'morning', startMinutes: null, date: today,
      priority: 'todo', done: false, steps: [], tag: 'Household',
    },
    {
      id: uid('work'), title: 'Start work', emoji: '💻', tint: 'sky',
      minutes: 45, slot: 'afternoon', startMinutes: 13 * 60, date: today,
      priority: 'todo', done: false, steps: [], tag: 'Work',
    },
    {
      id: uid('water'), title: 'Drink water', emoji: '💧', tint: 'mint',
      minutes: 5, slot: 'afternoon', startMinutes: null, date: today,
      priority: 'todo', done: false, steps: [], tag: 'Health',
    },
    {
      id: uid('lunch'), title: 'Lunch', emoji: '🥪', tint: 'rose',
      minutes: 20, slot: 'afternoon', startMinutes: 12 * 60 + 30, date: today,
      priority: 'todo', done: false, steps: [], tag: 'Human needs',
    },
    {
      id: uid('dinner'), title: 'Have dinner', emoji: '🍝', tint: 'rose',
      minutes: 20, slot: 'evening', startMinutes: 18 * 60, date: today,
      priority: 'todo', done: false, steps: [], tag: 'Human needs',
    },
    {
      id: uid('evening'), title: 'Evening routine', emoji: '🌙', tint: 'sky',
      minutes: 10, slot: 'evening', startMinutes: 21 * 60 + 30, date: today,
      priority: 'todo', done: false, tag: 'Self care',
      steps: [step('s5', 'Tidy up'), step('s6', 'Read a chapter')],
    },
    // To-do inbox — no date, sorted by priority instead of time.
    {
      id: uid('dentist'), title: 'Book dentist', emoji: '🦷', tint: 'sky',
      minutes: 15, slot: 'anytime', startMinutes: null, date: null,
      priority: 'medium', done: false, steps: [], tag: 'Health',
    },
    {
      id: uid('laundry'), title: 'Do laundry', emoji: '🧺', tint: 'mint',
      minutes: 60, slot: 'anytime', startMinutes: null, date: null,
      priority: 'low', done: false, steps: [], tag: 'Household',
    },
  ];
}

/** Suggestions shown in the quick-add sheet, so a blank field is never a dead end. */
export const SUGGESTIONS: Array<Pick<Task, 'title' | 'emoji' | 'tint' | 'minutes'>> = [
  { title: 'Take a walk', emoji: '🚶', tint: 'mint', minutes: 25 },
  { title: 'Answer emails', emoji: '📧', tint: 'sky', minutes: 20 },
  { title: 'Stretch', emoji: '🧘', tint: 'butter', minutes: 10 },
  { title: 'Tidy desk', emoji: '🧹', tint: 'lilac', minutes: 15 },
  { title: 'Call someone', emoji: '📞', tint: 'peach', minutes: 15 },
  { title: 'Drink water', emoji: '💧', tint: 'mint', minutes: 5 },
];

export const EMOJI_CHOICES = [
  '📝','🌅','🧹','💻','💧','🥪','🍝','🌙','📚','🏃','🧘','🎧',
  '🛒','🐕','💊','📞','✉️','🎨','🧺','🌱','☕️','🛏️','🚿','🧠',
];

export const TAGS = [
  'Work', 'Study', 'Health', 'Self care', 'Household',
  'Human needs', 'Exercise', 'Social', 'Admin', 'Hobby',
];
