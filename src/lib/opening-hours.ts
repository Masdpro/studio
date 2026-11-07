/**
 * Opening hours are stored as readable text, e.g. "Mon–Fri, 8:00 AM – 6:00 PM; Sat, 9:00 AM – 4:00 PM".
 * The picker builds that text from rows of (days, open, close) and can read it back.
 */
export const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;
export type Day = (typeof DAYS)[number];

export type HoursRow = { days: Day[]; open: string; close: string; allDay: boolean };

/** "08:00" … "23:30" in half-hour steps. */
export const TIME_OPTIONS: string[] = Array.from({ length: 48 }, (_, i) => {
  const h = Math.floor(i / 2);
  return `${String(h).padStart(2, '0')}:${i % 2 ? '30' : '00'}`;
});

export function to12h(t: string): string {
  const [h, m] = t.split(':').map(Number);
  const suffix = h < 12 ? 'AM' : 'PM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${suffix}`;
}

function from12h(s: string): string | null {
  const m = s.trim().match(/^(\d{1,2}):(\d{2})\s*([AP]M)$/i);
  if (!m) return null;
  let h = Number(m[1]) % 12;
  if (m[3].toUpperCase() === 'PM') h += 12;
  return `${String(h).padStart(2, '0')}:${m[2]}`;
}

function formatDays(days: Day[]): string {
  const idx = DAYS.filter((d) => days.includes(d)).map((d) => DAYS.indexOf(d));
  if (idx.length === 7) return 'Every day';
  const parts: string[] = [];
  let start = 0;
  for (let i = 1; i <= idx.length; i++) {
    if (i === idx.length || idx[i] !== idx[i - 1] + 1) {
      const a = idx[start];
      const b = idx[i - 1];
      parts.push(b - a >= 2 ? `${DAYS[a]}–${DAYS[b]}` : b === a ? DAYS[a] : `${DAYS[a]}, ${DAYS[b]}`);
      start = i;
    }
  }
  return parts.join(', ');
}

function parseDays(s: string): Day[] | null {
  if (s.trim().toLowerCase() === 'every day') return [...DAYS];
  const out: Day[] = [];
  for (const token of s.split(',').map((t) => t.trim()).filter(Boolean)) {
    const range = token.split(/[–-]/).map((t) => t.trim());
    const a = DAYS.indexOf(range[0] as Day);
    const b = DAYS.indexOf((range[1] ?? range[0]) as Day);
    if (a < 0 || b < 0 || b < a) return null;
    for (let i = a; i <= b; i++) out.push(DAYS[i]);
  }
  return out.length ? out : null;
}

export function formatHours(rows: HoursRow[]): string {
  return rows
    .filter((r) => r.days.length)
    .map((r) => `${formatDays(r.days)}, ${r.allDay ? 'Open 24 hours' : `${to12h(r.open)} – ${to12h(r.close)}`}`)
    .join('; ');
}

/** Reads text produced by formatHours back into rows; null if it was typed some other way. */
export function parseHours(text: string): HoursRow[] | null {
  if (!text.trim()) return null;
  const rows: HoursRow[] = [];
  for (const seg of text.split(';').map((s) => s.trim()).filter(Boolean)) {
    const allDay = seg.match(/^(.*),\s*Open 24 hours$/i);
    if (allDay) {
      const days = parseDays(allDay[1]);
      if (!days) return null;
      rows.push({ days, open: '00:00', close: '23:30', allDay: true });
      continue;
    }
    const m = seg.match(/^(.*),\s*(\d{1,2}:\d{2}\s*[AP]M)\s*[–-]\s*(\d{1,2}:\d{2}\s*[AP]M)$/i);
    if (!m) return null;
    const days = parseDays(m[1]);
    const open = from12h(m[2]);
    const close = from12h(m[3]);
    if (!days || !open || !close) return null;
    rows.push({ days, open, close, allDay: false });
  }
  return rows.length ? rows : null;
}

export const HOURS_PRESETS: { label: string; rows: HoursRow[] }[] = [
  { label: 'Mon–Sat, 8 AM – 6 PM', rows: [{ days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], open: '08:00', close: '18:00', allDay: false }] },
  { label: 'Mon–Fri, 9 AM – 5 PM', rows: [{ days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], open: '09:00', close: '17:00', allDay: false }] },
  { label: 'Every day, 8 AM – 9 PM', rows: [{ days: [...DAYS], open: '08:00', close: '21:00', allDay: false }] },
  {
    label: 'Weekdays + shorter Saturday',
    rows: [
      { days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], open: '08:00', close: '18:00', allDay: false },
      { days: ['Sat'], open: '09:00', close: '16:00', allDay: false },
    ],
  },
  { label: 'Open 24 hours', rows: [{ days: [...DAYS], open: '00:00', close: '23:30', allDay: true }] },
];

export const DEFAULT_HOURS = formatHours(HOURS_PRESETS[0].rows);
