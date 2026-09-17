import { useEffect, useState } from 'react';
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
