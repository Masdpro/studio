import { NextResponse } from 'next/server';
import { sentryDsn, sentryEnvironment, sentryRelease } from '@/lib/monitoring';

export const dynamic = 'force-dynamic';

/** Browser error-tracking settings, read at run time so the DSN can be set as a Fly secret without a rebuild. */
export async function GET() {
  return NextResponse.json(
    { dsn: sentryDsn() ?? null, environment: sentryEnvironment(), release: sentryRelease() ?? null },
    { headers: { 'Cache-Control': 'public, max-age=300' } },
  );
}
