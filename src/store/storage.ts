import { createMMKV } from 'react-native-mmkv';
import type { StateStorage } from 'zustand/middleware';

const mmkv = createMMKV({ id: 'oneplan' });

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
