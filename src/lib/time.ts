/** Pure date/duration helpers. No component should format time inline. */

export type Slot = 'anytime' | 'morning' | 'afternoon' | 'evening';

export const SLOT_ORDER: Slot[] = ['anytime', 'morning', 'afternoon', 'evening'];

export const SLOT_LABEL: Record<Slot, string> = {
  anytime: 'Anytime',
  morning: 'Morning',
  afternoon: 'Afternoon',
  evening: 'Evening',
};

/** Local-timezone YYYY-MM-DD. Never use toISOString() — it shifts to UTC. */
export function dateKey(d: Date): string {
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

export function parseKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(d: Date, n: number): Date {
  const next = new Date(d);
  next.setDate(next.getDate() + n);
  return next;
}

export function isToday(key: string): boolean {
  return key === dateKey(new Date());
}

/** "Thursday" */
export function weekdayLong(d: Date): string {
  return d.toLocaleDateString(undefined, { weekday: 'long' });
}

/** "January 15th, 2026" — the ordinal is what makes it feel written, not printed. */
export function longDate(d: Date): string {
  const month = d.toLocaleDateString(undefined, { month: 'long' });
  return `${month} ${ordinal(d.getDate())}, ${d.getFullYear()}`;
}

export function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

/** 45 -> "45m", 90 -> "1h 30m", 60 -> "1h". Trailing zeros are noise. */
export function formatDuration(mins: number): string {
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

/** minutes-from-midnight -> "8:00 AM" */
export function formatClock(minutes: number): string {
  const d = new Date();
  d.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

/** Seconds -> "09:59". Always two-digit minutes so the glyph count never jumps. */
export function formatTimer(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${`${m}`.padStart(2, '0')}:${`${sec}`.padStart(2, '0')}`;
}

/** Which slot a given minutes-from-midnight belongs to. */
export function slotForMinutes(m: number): Slot {
  if (m < 12 * 60) return 'morning';
  if (m < 17 * 60) return 'afternoon';
  return 'evening';
}

/** Wall-clock time `mins` from now — "Ends at 3:42 PM". Wraps past midnight. */
export function clockFromNow(mins: number): string {
  return formatClock((minutesNow() + Math.round(mins)) % (24 * 60));
}

export function minutesNow(): number {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
}

/** The 7 days centred on a week containing `d`, starting Sunday. */
export function weekAround(d: Date): Date[] {
  const start = addDays(d, -d.getDay());
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}
