import { NextResponse } from 'next/server';
import { publicPortfolio } from '@/lib/services/providers';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ serviceId: string }> };

/** Photos of past work for one service. */
export async function GET(_request: Request, ctx: Ctx) {
  const { serviceId } = await ctx.params;
  const p = publicPortfolio(serviceId);
  if (!p) return NextResponse.json({ error: 'This service is no longer available.' }, { status: 404 });
  return NextResponse.json(p);
}
