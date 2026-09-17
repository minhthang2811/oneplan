import {
  createContext, useContext, useEffect, useState, type ReactNode,
} from 'react';
import { AppState } from 'react-native';
import { dateKey } from './time';

/**
 * Today's `YYYY-MM-DD`, kept live.
 *
 * ── WHY THIS EXISTS ────────────────────────────────────────────────────────
 * "Today" was read once, with `new Date()`, at the moment a component first
 * rendered — in the Today screen's `useState` initialiser and in the tab bar's
 * calendar glyph. Neither is a mount-only fact. A phone left on the charger
 * overnight, or an app merely backgrounded and reopened the next morning, kept
 * showing yesterday: yesterday's weekday in the header, yesterday's number in
 * the tab bar, yesterday's ring on the week strip, and `isToday()` answering
 * false for the day the user was actually looking at.
 *
 * ── THE TICK IS ALIGNED TO MIDNIGHT, NOT POLLED ────────────────────────────
 * One timer set to the next local midnight, re-armed each time it fires, so
 * the rollover happens ON the boundary rather than up to a minute late — and
 * costs one timer rather than a check every minute. It is also re-read on
 * foreground, because timers do not fire while the app is suspended, which is
 * the case that actually happens: phones are asleep at midnight.
 *
 * `setDate` is called with the value rather than a setter so React can bail
 * out of the re-render when the string has not changed, which is every tick
 * except the one that matters.
 */
export function useTodayKey(): string {
  const [key, setKey] = useState(() => dateKey(new Date()));

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;

    const tick = () => setKey(dateKey(new Date()));

    const arm = () => {
      const now = new Date();
      const midnight = new Date(now);
      // `setDate(+1)` rather than adding 24h: on the day a clock goes back, a
      // local day is 25 hours long, and midnight is the start of the next
      // calendar date whatever its length.
      midnight.setDate(midnight.getDate() + 1);
      midnight.setHours(0, 0, 0, 0);
      // The extra second keeps the timer from firing a hair early and reading
      // the date it was trying to leave.
      timer = setTimeout(() => { tick(); arm(); }, midnight.getTime() - now.getTime() + 1000);
    };

    arm();
    const sub = AppState.addEventListener('change', (s) => {
      if (s !== 'active') return;
      tick();
      // The pending timer was armed against a midnight that may already have
      // passed while the app was suspended, so it is replaced rather than
      // trusted.
      if (timer) clearTimeout(timer);
      arm();
    });

    return () => {
      if (timer) clearTimeout(timer);
      sub.remove();
    };
  }, []);

  return key;
}

/**
 * ONE TIMER FOR THE WHOLE APP.
 *
 * Four components need to know what day it is — the root (to build today's
 * routines), Today, Me and the tab bar's calendar glyph — and calling the hook
 * in each of them armed four midnight timeouts and four `AppState` listeners
 * for a single shared fact. They all fire within milliseconds of each other at
 * the rollover, so the app paid for four re-render cascades where one would do.
 *
 * The root calls `useTodayKey()` once and publishes the result; everything else
 * reads it. `useToday()` falls back to its own hook when no provider is above
 * it, so a component rendered outside the tree — a test harness, a future
 * standalone screen — still gets a live date rather than a stale one.
 */
const TodayContext = createContext<string | null>(null);

export function TodayProvider({ value, children }: { value: string; children: ReactNode }) {
  return <TodayContext.Provider value={value}>{children}</TodayContext.Provider>;
}

export function useToday(): string {
  const shared = useContext(TodayContext);
  /**
   * THROWS RATHER THAN FALLING BACK, and the reason is that the fallback
   * cannot be written without giving up what this exists for. Calling
   * `useTodayKey()` here as a default would arm a timer in EVERY consumer,
   * provider or not — hooks cannot be called conditionally — which is the cost
   * the context was introduced to remove. The only other fallback is a date
   * read once, which is precisely the staleness bug all of this fixes.
   *
   * A missing provider is a wiring mistake, not a runtime condition, and it is
   * one the router's error boundary reports on the first render.
   */
  if (shared == null) {
    throw new Error('useToday() requires a <TodayProvider> above it.');
  }
  return shared;
}
