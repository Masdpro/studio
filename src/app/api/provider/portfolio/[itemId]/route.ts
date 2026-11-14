import { NextResponse } from 'next/server';
import { removePortfolioItem, updatePortfolioCaption } from '@/lib/services/providers';
import { bookingErrorResponse, providerOr401, readJson } from '@/lib/booking-api';

type Ctx = { params: Promise<{ itemId: string }> };

/** Changes a portfolio photo's caption: { caption }. */
export async function PATCH(request: Request, ctx: Ctx) {
  const v = await providerOr401();
  if ('res' in v) return v.res;
  const { itemId } = await ctx.params;
  try {
    return NextResponse.json({ item: updatePortfolioCaption(v.id, itemId, (await readJson(request)).caption) });
  } catch (err) {
    return bookingErrorResponse(err);
  }
}

/** Removes a portfolio photo. */
export async function DELETE(_request: Request, ctx: Ctx) {
  const v = await providerOr401();
  if ('res' in v) return v.res;
  const { itemId } = await ctx.params;
  try {
    removePortfolioItem(v.id, itemId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return bookingErrorResponse(err);
  }
}
