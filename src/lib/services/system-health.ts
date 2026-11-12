/** The checks behind the admin System health page. */
import fs from 'node:fs';
import path from 'node:path';
import { sql } from 'drizzle-orm';
import { readMigrationFiles } from 'drizzle-orm/migrator';
import { db } from '@/db';
import { eventCounts, recentEvents } from '@/lib/services/system-events';
import { lastPriceRun, priceStatus } from '@/lib/services/catalog-prices';
import { sentryDsn, sentryRelease } from '@/lib/monitoring';

export type Check = { id: string; label: string; status: 'ok' | 'warn' | 'off' | 'fail'; detail: string };

const has = (...keys: string[]) => keys.every((k) => !!process.env[k]);
const mb = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(bytes < 10 * 1024 * 1024 ? 1 : 0)} MB`;
const gb = (bytes: number) => `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`;

export function systemHealth(now = new Date()) {
  const live = !!process.env.FLY_APP_NAME;
  const checks: Check[] = [];

  // Database
  try {
    db.get(sql`select 1`);
    const file = process.env.DATABASE_URL ?? 'dev.db';
    const size = fs.existsSync(file) ? fs.statSync(file).size : 0;
    checks.push({ id: 'database', label: 'Database', status: 'ok', detail: `Responding. Size ${mb(size)}.` });
    try {
      const fsInfo = fs.statfsSync(path.dirname(path.resolve(file)));
      const free = fsInfo.bavail * fsInfo.bsize;
      const total = fsInfo.blocks * fsInfo.bsize;
      const pct = total ? Math.round((free / total) * 100) : 100;
      checks.push({ id: 'disk', label: 'Disk space', status: pct < 10 ? 'fail' : pct < 20 ? 'warn' : 'ok', detail: `${gb(free)} free of ${gb(total)} (${pct}%).` });
    } catch {
      // statfs not available on this system
    }
  } catch (err) {
    checks.push({ id: 'database', label: 'Database', status: 'fail', detail: `Not responding: ${(err as Error).message}` });
  }

  // Database updates
  try {
    const last = db.get<{ m: number | null }>(sql`select max(created_at) as m from __drizzle_migrations`)?.m ?? 0;
    const pending = readMigrationFiles({ migrationsFolder: path.join(process.cwd(), 'drizzle') }).filter((m) => m.folderMillis > Number(last)).length;
    checks.push({ id: 'migrations', label: 'Database updates', status: pending ? 'fail' : 'ok', detail: pending ? `${pending} update(s) not applied.` : 'All applied.' });
  } catch {
    // migration files not shipped with this build
  }

  checks.push({
    id: 'backups',
    label: 'Backups (Litestream to R2)',
    status: has('R2_BUCKET', 'R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY') ? 'ok' : live ? 'fail' : 'off',
    detail: has('R2_BUCKET') ? 'Every database change is copied to R2 within seconds.' : 'R2 is not set up, so the database is not backed up.',
  });
  checks.push({
    id: 'errors',
    label: 'Error tracking (Sentry)',
    status: sentryDsn() ? 'ok' : live ? 'warn' : 'off',
    detail: sentryDsn() ? 'Server and browser errors are reported to Sentry.' : 'SENTRY_DSN is not set.',
  });
  const service = (id: string, label: string, on: boolean, offDetail: string) =>
    checks.push({ id, label, status: on ? 'ok' : live ? 'warn' : 'off', detail: on ? 'Set up.' : offDetail });
  service('email', 'Email (Resend)', has('RESEND_API_KEY', 'EMAIL_FROM'), 'Not set up: emails are not sent.');
  service('sms', 'SMS (Termii)', has('TERMII_API_KEY', 'TERMII_SENDER_ID'), 'Not set up: SMS codes are not sent.');
  service('payments', 'Payments (Paystack)', has('PAYSTACK_SECRET_KEY'), 'Not set up: wallet top-ups and payouts are off.');
  service('turnstile', 'Bot check (Turnstile)', has('TURNSTILE_SITE_KEY', 'TURNSTILE_SECRET_KEY'), 'Not set up: sign-up has no bot check.');

  // Background jobs
  const prices = priceStatus();
  const lastRun = lastPriceRun();
  checks.push({
    id: 'prices',
    label: 'Suggested price update',
    status: prices.problem ? 'warn' : 'ok',
    detail: prices.problem ?? (lastRun ? `Last ran ${lastRun.toISOString().slice(0, 10)}; next around ${prices.nextRunAt?.slice(0, 10)}.` : 'Has not run yet.'),
  });

  const day = new Date(now.getTime() - 86_400_000);
  const week = new Date(now.getTime() - 7 * 86_400_000);
  const counts24h = eventCounts(day);
  const errors24h = Object.values(counts24h).reduce((n, c) => n + c.error, 0);
  checks.push({
    id: 'recent-errors',
    label: 'Problems in the last 24 hours',
    status: errors24h > 20 ? 'fail' : errors24h > 0 ? 'warn' : 'ok',
    detail: errors24h ? `${errors24h} error(s). See the list below.` : 'No errors.',
  });

  const overall = checks.some((c) => c.status === 'fail') ? 'fail' : checks.some((c) => c.status === 'warn') ? 'warn' : 'ok';
  return {
    overall,
    checks,
    counts: { day: counts24h, week: eventCounts(week) },
    server: {
      environment: live ? 'live' : 'development',
      release: sentryRelease() ?? null,
      node: process.versions.node,
      region: process.env.FLY_REGION ?? null,
      upSince: new Date(now.getTime() - process.uptime() * 1000).toISOString(),
      memory: mb(process.memoryUsage().rss),
    },
  };
}

export { recentEvents };
