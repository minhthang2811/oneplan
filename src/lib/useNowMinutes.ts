import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { minutesNow } from './time';

/**
 * Minutes-from-midnight, kept live.
 *
 * "Now" is derived state that depends on the clock, not on the store — so it
 * cannot live in a `useMemo` over tasks alone, or the highlight freezes at
 * whatever the time was when the screen mounted.
 *
 * Ticks are aligned to the minute boundary rather than every 60s from mount, so
 * the badge flips the moment the minute actually changes, and the clock is
 * re-read on foreground because timers do not fire while backgrounded.
 */
export function useNowMinutes(): number {
  const [minutes, setMinutes] = useState(minutesNow);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    const tick = () => setMinutes(minutesNow());

    const msToNextMinute = (60 - new Date().getSeconds()) * 1000;
    const timeout = setTimeout(() => {
      tick();
      interval = setInterval(tick, 60_000);
    }, msToNextMinute);

    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') tick();
    });

    return () => {
      clearTimeout(timeout);
      if (interval) clearInterval(interval);
      sub.remove();
    };
  }, []);

  return minutes;
}
