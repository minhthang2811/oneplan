import type { Task } from '../store/types';
import type { TintName } from '../theme/tokens';
import { dateKey } from '../lib/time';
import { translate, type TKey } from '../i18n';
import { en } from '../i18n/en';

const uid = (n: string) => `seed-${n}`;

const step = (id: string, key: TKey, done = false) => ({ id, title: translate(key), done });

/**
 * A believable first day, so the app is never an empty grid on launch.
 *
 * Written in whatever language is in effect at FIRST LAUNCH, and then left
 * alone: these become real, editable tasks the moment they are stored, and
 * re-translating a row someone has since renamed would quietly overwrite their
 * own words. Switching language later therefore relabels the app's chrome but
 * never the user's content — which is the behaviour every other planner has,
 * and the only one that is safe.
 */
export function seedTasks(): Task[] {
  const today = dateKey(new Date());
  return [
    {
      id: uid('plan'), title: translate('seed.plan'), emoji: '📝', tint: 'butter',
      minutes: 10, slot: 'morning', startMinutes: 8 * 60, date: today,
      priority: 'todo', done: false, steps: [], tag: 'admin',
    },
    {
      id: uid('morning'), title: translate('seed.morning'), emoji: '🌅', tint: 'peach',
      minutes: 30, slot: 'morning', startMinutes: 8 * 60 + 10, date: today,
      priority: 'todo', done: false, tag: 'selfCare',
      steps: [
        step('s1', 'seed.stepWake'),
        step('s2', 'seed.stepTeeth'),
        step('s3', 'seed.stepBreakfast'),
        step('s4', 'seed.stepCoffee'),
      ],
    },
    {
      id: uid('tidy'), title: translate('seed.tidy'), emoji: '🧹', tint: 'lilac',
      minutes: 5, slot: 'morning', startMinutes: null, date: today,
      priority: 'todo', done: false, steps: [], tag: 'household',
    },
    {
      id: uid('work'), title: translate('seed.work'), emoji: '💻', tint: 'sky',
      minutes: 45, slot: 'afternoon', startMinutes: 13 * 60, date: today,
      priority: 'todo', done: false, steps: [], tag: 'work',
    },
    {
      id: uid('water'), title: translate('seed.water'), emoji: '💧', tint: 'mint',
      minutes: 5, slot: 'afternoon', startMinutes: null, date: today,
      priority: 'todo', done: false, steps: [], tag: 'health',
    },
    {
      id: uid('lunch'), title: translate('seed.lunch'), emoji: '🥪', tint: 'rose',
      minutes: 20, slot: 'afternoon', startMinutes: 12 * 60 + 30, date: today,
      priority: 'todo', done: false, steps: [], tag: 'humanNeeds',
    },
    {
      id: uid('dinner'), title: translate('seed.dinner'), emoji: '🍝', tint: 'rose',
      minutes: 20, slot: 'evening', startMinutes: 18 * 60, date: today,
      priority: 'todo', done: false, steps: [], tag: 'humanNeeds',
    },
    {
      id: uid('evening'), title: translate('seed.evening'), emoji: '🌙', tint: 'sky',
      minutes: 10, slot: 'evening', startMinutes: 21 * 60 + 30, date: today,
      priority: 'todo', done: false, tag: 'selfCare',
      steps: [step('s5', 'seed.stepTidy'), step('s6', 'seed.stepRead')],
    },
    // To-do inbox — no date, sorted by priority instead of time.
    {
      id: uid('dentist'), title: translate('seed.dentist'), emoji: '🦷', tint: 'sky',
      minutes: 15, slot: 'anytime', startMinutes: null, date: null,
      priority: 'medium', done: false, steps: [], tag: 'health',
    },
    {
      id: uid('laundry'), title: translate('seed.laundry'), emoji: '🧺', tint: 'mint',
      minutes: 60, slot: 'anytime', startMinutes: null, date: null,
      priority: 'low', done: false, steps: [], tag: 'household',
    },
  ];
}

/**
 * Suggestions shown in the quick-add sheet, so a blank field is never a dead
 * end. `key` is the translation key; the title is resolved at render so the
 * chips follow the language without a relaunch.
 */
export const SUGGESTIONS: Array<{
  key: TKey;
  emoji: string;
  tint: TintName;
  minutes: number;
}> = [
  { key: 'suggestion.walk', emoji: '🚶', tint: 'mint', minutes: 25 },
  { key: 'suggestion.email', emoji: '📧', tint: 'sky', minutes: 20 },
  { key: 'suggestion.stretch', emoji: '🧘', tint: 'butter', minutes: 10 },
  { key: 'suggestion.desk', emoji: '🧹', tint: 'lilac', minutes: 15 },
  { key: 'suggestion.call', emoji: '📞', tint: 'peach', minutes: 15 },
  { key: 'suggestion.water', emoji: '💧', tint: 'mint', minutes: 5 },
];

export const EMOJI_CHOICES = [
  '📝','🌅','🧹','💻','💧','🥪','🍝','🌙','📚','🏃','🧘','🎧',
  '🛒','🐕','💊','📞','✉️','🎨','🧺','🌱','☕️','🛏️','🚿','🧠',
];

/**
 * Tag IDENTIFIERS, not tag names.
 *
 * A tag is written onto a task and persisted, so it has to be stable across a
 * language change: storing the word "Work" would leave a Vietnamese user with
 * English tags on every activity they had already filed, and storing "Công
 * việc" would do the same in reverse. The id is the durable value and
 * `tagLabel` is the only place it becomes words.
 */
export const TAGS = [
  'work', 'study', 'health', 'selfCare', 'household',
  'humanNeeds', 'exercise', 'social', 'admin', 'hobby',
] as const;

export type TagId = (typeof TAGS)[number];

/**
 * Tag id -> display name.
 *
 * Falls back to the raw stored string, which covers the two cases that are not
 * ids: a task written by an older build (where the tag WAS the English word),
 * and any tag a future build lets someone type themselves.
 */
export function tagLabel(tag: string): string {
  return tag in en.tag ? translate(`tag.${tag}` as TKey) : tag;
}
