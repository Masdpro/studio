/** Stores warnings and errors from the logger (see log.ts) for the admin System health page. */
import { desc, eq, gte, lt, sql } from 'drizzle-orm';
import { db } from '@/db';
import { systemEvents } from '@/db/schema';

const KEEP_DAYS = 30;
const MAX_DETAILS = 2000;

export function saveEvent({ level, area, message, details, requestId }: { level: 'warn' | 'error'; area: string; message: string; details: Record<string, unknown>; requestId?: string | null }) {
  let json = JSON.stringify(details);
  if (json.length > MAX_DETAILS) json = json.slice(0, MAX_DETAILS) + '…';
  db.insert(systemEvents)
    .values({ at: new Date(), level, area, message: message.slice(0, 500), details: json === '{}' ? null : json, requestId: requestId ?? null })
    .run();
}

export function recentEvents(opts: { area?: string; limit?: number } = {}) {
  const where = opts.area ? eq(systemEvents.area, opts.area) : undefined;
  return db
    .select()
    .from(systemEvents)
    .where(where)
    .orderBy(desc(systemEvents.at), desc(systemEvents.id))
    .limit(Math.min(opts.limit ?? 50, 200))
    .all()
    .map((e) => ({ ...e, at: e.at.toISOString(), details: e.details ? safeJson(e.details) : null }));
}

const safeJson = (s: string) => {
  try {
    return JSON.parse(s);
  } catch {
    return s;
  }
};

/** Warnings and errors per area since `since`. */
export function eventCounts(since: Date) {
  const rows = db
    .select({ area: systemEvents.area, level: systemEvents.level, n: sql<number>`count(*)` })
    .from(systemEvents)
    .where(gte(systemEvents.at, since))
    .groupBy(systemEvents.area, systemEvents.level)
    .all();
  const out: Record<string, { warn: number; error: number }> = {};
  for (const r of rows) {
    out[r.area] ??= { warn: 0, error: 0 };
    out[r.area][r.level] = r.n;
  }
  return out;
}

export function pruneEvents(now = new Date()) {
  return db.delete(systemEvents).where(lt(systemEvents.at, new Date(now.getTime() - KEEP_DAYS * 86_400_000))).run().changes;
}


let cleaning = false;
/** Deletes events older than 30 days, once a day. Started from instrumentation.ts. */
export function startEventCleanup() {
  if (cleaning || process.env.NODE_ENV === 'test') return;
  cleaning = true;
  const run = () => {
    try {
      pruneEvents();
    } catch {
      // try again tomorrow
    }
  };
  setTimeout(run, 60_000).unref?.();
  setInterval(run, 86_400_000).unref?.();
}
