import { NextResponse } from 'next/server';
import { addPortfolioItem } from '@/lib/services/providers';
import { bookingErrorResponse, providerOr401, readJson } from '@/lib/booking-api';

type Ctx = { params: Promise<{ serviceId: string }> };

/** Adds a photo of past work to a service: { imageUrl (from /api/provider/upload), caption? }. */
export async function POST(request: Request, ctx: Ctx) {
  const v = await providerOr401();
  if ('res' in v) return v.res;
  const { serviceId } = await ctx.params;
  try {
    return NextResponse.json({ item: addPortfolioItem(v.id, serviceId, await readJson(request)) }, { status: 201 });
  } catch (err) {
    return bookingErrorResponse(err);
  }
}
