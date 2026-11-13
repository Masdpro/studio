/** Lagos time (UTC+1, no daylight saving) for bookings. Safe to use in the browser. */
const LAGOS_OFFSET_MS = 3600_000;

/** "YYYY-MM-DD" for a moment, in Lagos. */
export function lagosDate(ms: number): string {
  return new Date(ms + LAGOS_OFFSET_MS).toISOString().slice(0, 10);
}
/** The moment a Lagos date and "HH:MM" happen. */
export function lagosMoment(date: string, hhmm: string): number {
  return Date.parse(`${date}T${hhmm}:00.000Z`) - LAGOS_OFFSET_MS;
}
/** "HH:MM" in Lagos. */
export function lagosClock(ms: number): string {
  return new Date(ms + LAGOS_OFFSET_MS).toISOString().slice(11, 16);
}
/** e.g. "Sat 14 Nov" for a Lagos date. */
export function dayLabel(date: string): string {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
}
/** e.g. "Sat 14 Nov, 10:30". */
export function whenLabel(ms: number): string {
  return `${dayLabel(lagosDate(ms))}, ${lagosClock(ms)}`;
}
/** e.g. "1 hr 30 min". */
export function durationLabel(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return [h ? `${h} hr` : '', m ? `${m} min` : ''].filter(Boolean).join(' ');
}
export const naira = (n: number) => `₦${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
