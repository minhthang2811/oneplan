import { createMMKV, existsMMKV } from 'react-native-mmkv';
import type { StateStorage } from 'zustand/middleware';

const mmkv = createMMKV({ id: 'pupu' });

/**
 * ── THE RENAME THAT WOULD OTHERWISE HAVE EATEN EVERY PLAN ──────────────────
 * The app used to be called Oneplan, and an MMKV instance is a FILE named
 * after its id. Changing the id from `oneplan` to `pupu` therefore does not
 * rename anything — it opens a second, empty file, and a returning user's
 * tasks, routines and language choice sit untouched in a store nothing reads
 * any more. They would be shown onboarding as if they had just installed.
 *
 * So the first launch after the rename adopts the old store's contents. The
 * key names moved too (`oneplan-v1` is Zustand's persist key), hence a map
 * rather than a copy loop.
 *
 * The guard is "has the new store been written yet", not a stored flag: once
 * anything lives under the new names, this must never run again or it would
 * overwrite real edits with the frozen pre-rename snapshot.
 *
 * The legacy file is deliberately NOT deleted. It is a few kilobytes, and
 * keeping it means a mistake here is recoverable rather than terminal.
 *
 * ── WHAT THIS DOES *NOT* RESCUE ────────────────────────────────────────────
 * The rename also changed the bundle identifier, and iOS gives a new bundle id
 * a new container — so an install of the old `com.oneplan.app` is a different
 * app on disk and its store is simply unreachable from here. This migration is
 * for continuity WITHIN one bundle id: an OTA update, a dev build, and anyone
 * who decides to keep the original identifier. It was never shipped under the
 * old name, so that is the whole of the exposure; if it ever had been, the
 * identifier is the thing that would have to stay.
 */
const LEGACY_ID = 'oneplan';
const LEGACY_KEYS: Record<string, string> = {
  'oneplan-v1': 'pupu-v1',
  'oneplan-language': 'pupu-language',
};

function adoptLegacyStore() {
  try {
    // `existsMMKV` first, because `createMMKV` would CREATE the legacy file on
    // a fresh install and leave every new user carrying an empty Oneplan store.
    if (!existsMMKV(LEGACY_ID)) return;
    if (Object.values(LEGACY_KEYS).some((key) => mmkv.contains(key))) return;

    const legacy = createMMKV({ id: LEGACY_ID });
    for (const [from, to] of Object.entries(LEGACY_KEYS)) {
      const value = legacy.getString(from);
      if (value != null) mmkv.set(to, value);
    }
  } catch {
    // A migration that throws at import time would be a boot loop, which is a
    // worse outcome than the empty-plan one it is trying to prevent.
  }
}

adoptLegacyStore();

/**
 * MMKV is synchronous, so Zustand rehydrates before the first paint. That is
 * what lets the root redirect resolve on frame one instead of flashing
 * onboarding at a returning user.
 */
export const mmkvStorage: StateStorage = {
  getItem: (name) => mmkv.getString(name) ?? null,
  setItem: (name, value) => mmkv.set(name, value),
  removeItem: (name) => { mmkv.remove(name); },
};

export { mmkv };
