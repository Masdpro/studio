import { NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { db } from '@/db';
import { sentryRelease } from '@/lib/monitoring';

export const dynamic = 'force-dynamic';

/**
 * Fly.io pings this every 30 seconds and restarts the machine if it fails; the external uptime
 * monitor (Better Stack) checks it too and alerts us. Kept quick: it only proves the app answers
 * and the database responds.
 */
export async function GET() {
  try {
    db.get(sql`select 1`);
    return NextResponse.json({ ok: true, database: 'ok', release: sentryRelease() ?? null }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ ok: false, database: 'down' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
