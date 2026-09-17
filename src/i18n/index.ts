import { useCallback, useEffect, useMemo } from 'react';
import { AppState } from 'react-native';
import { getLocales } from 'expo-localization';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { mmkvStorage } from '../store/storage';
import { en, type Dict } from './en';
import { vi } from './vi';

/* ----------------------------------------------------------------- types -- */

/** A language the app actually ships strings for. */
export type Locale = 'en' | 'vi';

/**
 * What the user has CHOSEN. `'system'` is not a language — it is the
 * instruction to keep following the phone, which is a different thing from
 * having picked the language the phone happens to be set to today.
 */
export type Language = 'system' | Locale;

export const LOCALES: Locale[] = ['en', 'vi'];

/**
 * Each language's name IN ITSELF (its endonym).
 *
 * Never localised. Every top app's language list does this, for the obvious
 * reason: someone who has landed in a language they cannot read needs to find
 * their own language by sight, and "Vietnamese" is no help to a reader who only
 * knows "Tiếng Việt".
 */
export const LOCALE_NAME: Record<Locale, string> = {
  en: 'English',
  vi: 'Tiếng Việt',
};

/** BCP-47 tags handed to `Intl` / `toLocaleDateString`. */
export const LOCALE_TAG: Record<Locale, string> = {
  en: 'en-US',
  vi: 'vi-VN',
};

const FALLBACK: Locale = 'en';

const CATALOGUES: Record<Locale, Dict> = { en, vi };

function isLocale(v: string): v is Locale {
  return (LOCALES as string[]).includes(v);
}

/* ------------------------------------------------------- device detection -- */

/**
 * The phone's preferred language, narrowed to one we can actually render.
 *
 * `getLocales()` is ORDERED by the user's own preference list, so walking it
 * and taking the first supported hit is what makes a phone set to
 * [Khmer, Vietnamese, English] open in Vietnamese rather than in English —
 * matching only the single top entry would throw that second choice away.
 *
 * Matching is on `languageCode`, never on `languageTag`: a phone set to
 * Vietnamese reports "vi-VN", and a Vietnamese speaker in the US reports
 * "vi-US". Both are Vietnamese.
 */
export function detectDeviceLocale(): Locale {
  for (const l of getLocales()) {
    const code = l.languageCode?.toLowerCase();
    if (code && isLocale(code)) return code;
  }
  return FALLBACK;
}

/* ------------------------------------------------------------------ store -- */

type LanguageState = {
  /** The user's choice. Persisted. */
  language: Language;
  /** What the OS currently says. Detected at launch, never persisted. */
  device: Locale;
  setLanguage: (l: Language) => void;
  refreshDevice: () => void;
};

/**
 * Language lives in its OWN store, not in `usePlanStore`.
 *
 * `seedTasks()` and the routine catalogue need `translate()`, and the plan
 * store imports both — putting language in the plan store would close an import
 * cycle. Keeping it separate also means a language change re-renders only what
 * reads language, instead of everything subscribed to the plan.
 */
export const useLanguageStore = create<LanguageState>()(
  persist(
    (set) => ({
      language: 'system',
      device: detectDeviceLocale(),
      setLanguage: (language) => set({ language }),
      refreshDevice: () => set({ device: detectDeviceLocale() }),
    }),
    {
      name: 'pupu-language',
      storage: createJSONStorage(() => mmkvStorage),
      /**
       * Only the CHOICE survives a relaunch. `device` is re-detected every
       * launch on purpose — persisting it would mean an app that keeps opening
       * in the language the phone used to be set to.
       */
      partialize: (s) => ({ language: s.language }),
    }
  )
);

/** The language actually in effect right now. */
export function resolveLocale(language: Language, device: Locale): Locale {
  return language === 'system' ? device : language;
}

/** For module-level callers (notifications, seeding) that have no hooks. */
export function currentLocale(): Locale {
  const s = useLanguageStore.getState();
  return resolveLocale(s.language, s.device);
}

/** The BCP-47 tag for the language in effect. */
export function currentTag(): string {
  return LOCALE_TAG[currentLocale()];
}

/**
 * Keeps `device` in step with the OS.
 *
 * Android lets the user change app language from Settings WITHOUT restarting
 * the process, and Expo's guidance is to re-read the locale when the app
 * returns to the foreground. iOS freezes the value for the process lifetime, so
 * there this is simply a no-op that costs one native read per foreground.
 *
 * Mounted once, at the root.
 */
export function useDeviceLocaleSync(): void {
  const refreshDevice = useLanguageStore((s) => s.refreshDevice);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') refreshDevice();
    });
    return () => sub.remove();
  }, [refreshDevice]);
}

/* ------------------------------------------------------------ translation -- */

type Plural = { one: string; other: string };
type Leaf = string | Plural;

/**
 * Every dotted path through the catalogue that lands on a translatable value.
 *
 * This is what turns `t('todya.title')` into a compile error. A plural node is
 * a leaf, not a branch — `{ one, other }` is a value, and `t` chooses between
 * its two halves rather than the caller addressing them.
 */
type Paths<T> = T extends Leaf
  ? never
  : {
      [K in keyof T & string]: T[K] extends Leaf ? K : `${K}.${Paths<T[K]>}`;
    }[keyof T & string];

export type TKey = Paths<Dict>;

export type Vars = Record<string, string | number>;

function isPlural(v: unknown): v is Plural {
  return typeof v === 'object' && v !== null && 'one' in v && 'other' in v;
}

function lookup(dict: Dict, key: string): Leaf | undefined {
  let node: unknown = dict;
  for (const part of key.split('.')) {
    if (typeof node !== 'object' || node === null) return undefined;
    node = (node as Record<string, unknown>)[part];
  }
  return typeof node === 'string' || isPlural(node) ? (node as Leaf) : undefined;
}

/** `{name}` -> `vars.name`. An unmatched placeholder is left visible on purpose. */
function fill(template: string, vars?: Vars): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (whole, name: string) =>
    name in vars ? String(vars[name]) : whole
  );
}

/**
 * Resolve one key against one catalogue.
 *
 * Plural selection is `count === 1`, not `Intl.PluralRules`. Both languages
 * shipped here are covered exactly by that rule — English has the two forms,
 * Vietnamese has none and stores the same sentence twice — and a hand-written
 * rule cannot disagree with the catalogue the way a runtime CLDR category can
 * (Polish would need `few`/`many` keys that do not exist here). Revisit this
 * the day a language with more than two forms is added.
 */
export function translateIn(locale: Locale, key: TKey, vars?: Vars): string {
  const node = lookup(CATALOGUES[locale], key) ?? lookup(CATALOGUES[FALLBACK], key);
  if (node === undefined) {
    if (__DEV__) console.warn(`[i18n] missing key: ${key}`);
    return key;
  }
  if (isPlural(node)) {
    const count = Number(vars?.count ?? 0);
    return fill(count === 1 ? node.one : node.other, vars);
  }
  return fill(node, vars);
}

/**
 * Whether a stored string is one of our keys.
 *
 * Onboarding stores the KEY of the answer someone picked rather than the words,
 * so the answer follows a later language change. Builds before that stored the
 * English sentence itself, and this is what tells the two apart so an upgrading
 * user keeps seeing their own answer instead of a raw key.
 */
export function hasKey(value: string): value is TKey {
  return lookup(en, value) !== undefined;
}

/** Translate outside React — notifications, seeding, store actions. */
export function translate(key: TKey, vars?: Vars): string {
  return translateIn(currentLocale(), key, vars);
}

export type TFn = (key: TKey, vars?: Vars) => string;

/**
 * The hook every screen uses.
 *
 * Returning the locale alongside `t` matters: anything that formats a date, a
 * time or a number needs the TAG, and a component that subscribes to `t` but
 * formats dates from a stale tag is the classic half-translated screen.
 */
export function useT(): { t: TFn; locale: Locale; tag: string } {
  const language = useLanguageStore((s) => s.language);
  const device = useLanguageStore((s) => s.device);
  const locale = resolveLocale(language, device);

  /**
   * `t` is memoised on the locale, not rebuilt each render.
   *
   * Several screens list it in a `useMemo`/`useCallback` dependency array — an
   * action sheet's options, the routine summary in Me — and a fresh closure
   * every render would quietly defeat all of them. Keyed on `locale` so it
   * still changes exactly when the words do.
   */
  const t = useCallback<TFn>((key, vars) => translateIn(locale, key, vars), [locale]);

  return useMemo(() => ({ t, locale, tag: LOCALE_TAG[locale] }), [t, locale]);
}
