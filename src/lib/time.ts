/**
 * Pure date/duration helpers. No component should format time inline.
 *
 * Everything user-visible here reads the CURRENT LOCALE at call time, via
 * `currentTag()` / `translate()`. That is deliberate: these are called from
 * dozens of sites, and threading a locale argument through all of them would
 * turn one concern into a parameter on every signature. The screens re-render
 * on a language change because they subscribe through `useT()`, so a call made
 * during that render already sees the new locale.
 */

import { currentLocale, currentTag, translate, type Locale } from '../i18n';

export type Slot = 'anytime' | 'morning' | 'afternoon' | 'evening';

export const SLOT_ORDER: Slot[] = ['anytime', 'morning', 'afternoon', 'evening'];

/** Localised name of a time-of-day bucket. */
export function slotLabel(slot: Slot): string {
  return translate(`slot.${slot}`);
}

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

/** "Thursday" / "Thứ Năm" */
export function weekdayLong(d: Date): string {
  return d.toLocaleDateString(currentTag(), { weekday: 'long' });
}

/**
 * "January 15th, 2026" / "15 tháng 1, 2026".
 *
 * The ORDER, the day's spelling and the month's CASE are all localised, and
 * all three live in the catalogue rather than here.
 *
 * Order comes from the `date.long` template, because month-first is an English
 * habit rather than a universal one. The ordinal suffix is English-only — it is
 * what makes the date feel written instead of printed — so it is applied per
 * locale rather than baked into the template, where every other language would
 * inherit a "15th" it has no use for. And both the month NAME and its NUMBER
 * are offered, because `Intl` returns the standalone form of a month ("Tháng
 * 9") while some languages want the in-context one ("tháng 9") — a catalogue
 * that disagrees with `Intl` can spell the word itself.
 */
export function longDate(d: Date): string {
  const tag = currentTag();
  return translate('date.long', {
    month: d.toLocaleDateString(tag, { month: 'long' }),
    monthNum: d.getMonth() + 1,
    day: dayNumeral(currentLocale(), d.getDate()),
    year: d.getFullYear(),
  });
}

/** English writes the day as an ordinal; Vietnamese writes the bare number. */
function dayNumeral(locale: Locale, n: number): string {
  return locale === 'en' ? ordinal(n) : String(n);
}

export function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

/** 45 -> "45m" / "45 phút", 90 -> "1h 30m" / "1 giờ 30 phút". */
export function formatDuration(mins: number): string {
  if (mins < 60) return translate('duration.m', { m: mins });
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  // Trailing zeros are noise: a whole hour is "1h", never "1h 0m".
  return m === 0
    ? translate('duration.h', { h })
    : translate('duration.hm', { h, m });
}

/**
 * The tight form, for anywhere too narrow to spell the unit out.
 *
 * English gains nothing from this — "45m" is already the short form — but
 * Vietnamese spells "45 phút", and at full length it wraps a 56pt preset chip
 * onto two lines and pushes a stat tile's serif numeral onto a second line.
 * Prose keeps `formatDuration`; fixed-width chrome uses this.
 */
export function formatDurationShort(mins: number): string {
  if (mins < 60) return translate('duration.shortM', { m: mins });
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0
    ? translate('duration.shortH', { h })
    : translate('duration.shortHm', { h, m });
}

/** minutes-from-midnight -> "8:00 AM" / "08:00" */
export function formatClock(minutes: number): string {
  const d = new Date();
  d.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
  return d.toLocaleTimeString(currentTag(), { hour: 'numeric', minute: '2-digit' });
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
