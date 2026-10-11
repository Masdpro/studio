import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { EVENT_TYPES, type EventType } from '@/lib/analytics-events';
import { recordEvent } from '@/lib/services/events';

// Tiny in-memory limiter: 120 events per session per minute.
const hits = new Map<string, { n: number; reset: number }>();

const clip = (v: unknown, max: number) => (typeof v === 'string' && v.length > 0 ? v.slice(0, max) : null);

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') return new NextResponse(null, { status: 400 });

  const type = body.type as EventType;
  const sessionId = clip(body.sessionId, 64);
  if (!EVENT_TYPES.includes(type) || !sessionId) return new NextResponse(null, { status: 400 });
  // order_placed is recorded server-side only, so it can't be forged from the browser.
  if (type === 'order_placed') return new NextResponse(null, { status: 400 });

  const now = Date.now();
  const h = hits.get(sessionId);
  if (!h || h.reset < now) hits.set(sessionId, { n: 1, reset: now + 60_000 });
  else if (++h.n > 120) return new NextResponse(null, { status: 429 });
  if (hits.size > 5000) for (const [k, v] of hits) if (v.reset < now) hits.delete(k);

  const session = await getServerSession(authOptions);
  recordEvent({
    type,
    sessionId,
    userId: session?.user?.id ?? null,
    path: clip(body.path, 200),
    productId: clip(body.productId, 64),
    vendorId: clip(body.vendorId, 64),
    term: clip(body.term, 80)?.toLowerCase() ?? null,
  });
  return new NextResponse(null, { status: 204 });
}
