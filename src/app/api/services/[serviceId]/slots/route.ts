import { NextResponse } from 'next/server';
import { availableSlots } from '@/lib/services/bookings';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ serviceId: string }> };

/** GET ?date=YYYY-MM-DD[&booking=<id being moved>] -> free start times that day. */
export async function GET(request: Request, ctx: Ctx) {
  const { serviceId } = await ctx.params;
  const url = new URL(request.url);
  return NextResponse.json({ slots: availableSlots(serviceId, url.searchParams.get('date') ?? '', Date.now(), url.searchParams.get('booking') ?? undefined) });
}
