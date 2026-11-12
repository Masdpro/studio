/**
 * Server logging. One JSON line per entry in production (Fly collects stdout and can ship it to a
 * log service), readable lines in development. Every entry can carry the request ID that the
 * middleware puts on each request (x-request-id), so one order or payment can be followed
 * through the logs.
 *
 * Warnings and errors with an `area` are also saved as system events for the admin System health
 * page, and errors are sent to Sentry when SENTRY_DSN is set.
 *
 *   log.error('Termii refused the SMS', { area: 'sms', status: 400 });
 *   const rlog = log.forRequest(request); rlog.info('payout started', { reference });
 */
import * as Sentry from '@sentry/nextjs';

export type Level = 'debug' | 'info' | 'warn' | 'error';
export type Area = 'payments' | 'sms' | 'email' | 'jobs' | 'stock' | 'security' | 'app';
/** `report: false` skips Sentry (for errors already sent there). */
export type Fields = { area?: Area; err?: unknown; requestId?: string | null; report?: boolean; [key: string]: unknown };

const isProd = process.env.NODE_ENV === 'production';
const quietTests = process.env.NODE_ENV === 'test' && !process.env.LOG_IN_TESTS;
const SECRET_KEY = /pass(word)?|secret|token|authorization|cookie|api[-_]?key|otp|pin|code$/i;

/** Error objects don't serialise on their own; keep what helps and drop secrets from fields. */
function clean(fields: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(fields)) {
    if (v === undefined) continue;
    if (SECRET_KEY.test(k)) out[k] = '[hidden]';
    else if (v instanceof Error) out[k] = { name: v.name, message: v.message, stack: v.stack?.split('\n').slice(0, 8).join('\n') };
    else out[k] = v;
  }
  return out;
}

/** Saves warnings/errors for the admin System health page. Loaded lazily so this file stays usable anywhere. */
function record(entry: { level: 'warn' | 'error'; area: string; message: string; details: Record<string, unknown>; requestId?: string | null }) {
  if (process.env.NEXT_RUNTIME === 'edge') return;
  pending = pending
    .then(() => import('@/lib/services/system-events'))
    .then((m) => m.saveEvent(entry))
    .catch(() => {
      // Logging must never break the request.
    });
}
let pending: Promise<unknown> = Promise.resolve();
/** For tests: wait until queued system events are saved. */
export const flushLogs = () => pending;

function write(level: Level, message: string, fields: Fields = {}) {
  const { area, requestId, report, ...rest } = fields;
  const details = clean(rest);
  if (!quietTests) {
    if (isProd) {
      const line = JSON.stringify({ time: new Date().toISOString(), level, msg: message, area, requestId: requestId ?? undefined, ...details });
      (level === 'error' ? console.error : level === 'warn' ? console.warn : console.log)(line);
    } else {
      const head = `${level.toUpperCase()}${area ? ` [${area}]` : ''}${requestId ? ` (${requestId.slice(0, 8)})` : ''} ${message}`;
      const tail = Object.keys(details).length ? details : '';
      (level === 'error' ? console.error : level === 'warn' ? console.warn : console.log)(head, tail);
    }
  }
  if ((level === 'warn' || level === 'error') && area) record({ level, area, message, details, requestId });
  if (level === 'error' && report !== false) {
    try {
      const err = fields.err instanceof Error ? fields.err : new Error(message);
      Sentry.captureException(err, { tags: { area: area ?? 'app', requestId: requestId ?? undefined }, extra: details });
    } catch {
      // Sentry not set up: nothing to do.
    }
  }
}

function make(base: Fields = {}) {
  const at = (level: Level) => (message: string, fields: Fields = {}) => write(level, message, { ...base, ...fields });
  return {
    debug: at('debug'),
    info: at('info'),
    warn: at('warn'),
    error: at('error'),
    /** A logger that adds this request's ID to everything it writes. */
    forRequest: (request: Request | { headers: Headers }) => make({ ...base, requestId: requestIdOf(request) }),
    with: (more: Fields) => make({ ...base, ...more }),
  };
}

export function requestIdOf(request: Request | { headers: Headers }): string | null {
  return request.headers.get('x-request-id') ?? request.headers.get('fly-request-id');
}

export const log = make();
