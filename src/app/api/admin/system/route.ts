import { NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/admin-guard';
import { recentEvents, systemHealth } from '@/lib/services/system-health';

export const dynamic = 'force-dynamic';

const AREAS = ['payments', 'sms', 'email', 'jobs', 'stock', 'security', 'app'];

/** GET ?area= -> health checks, problem counts and the latest problems (admins only). */
export async function GET(request: Request) {
  if (!(await requireAdminSession())) return NextResponse.json({ error: 'Admin access required.' }, { status: 403 });
  const area = new URL(request.url).searchParams.get('area') ?? undefined;
  return NextResponse.json({
    ...systemHealth(),
    events: recentEvents({ area: area && AREAS.includes(area) ? area : undefined, limit: 100 }),
  });
}
