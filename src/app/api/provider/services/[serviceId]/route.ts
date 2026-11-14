import { NextResponse } from 'next/server';
import { deleteService, updateService } from '@/lib/services/bookings';
import { bookingErrorResponse, readJson, providerOr401 } from '@/lib/booking-api';

type Ctx = { params: Promise<{ serviceId: string }> };

/** Edits a service (including pausing it). */
export async function PATCH(request: Request, ctx: Ctx) {
  const v = await providerOr401({ trading: true });
  if ('res' in v) return v.res;
  const { serviceId } = await ctx.params;
  try {
    return NextResponse.json({ service: updateService(v.id, serviceId, (await readJson(request)) as any) });
  } catch (err) {
    return bookingErrorResponse(err);
  }
}

/** Removes a service (paused instead if it still has upcoming bookings). */
export async function DELETE(_request: Request, ctx: Ctx) {
  const v = await providerOr401();
  if ('res' in v) return v.res;
  const { serviceId } = await ctx.params;
  try {
    return NextResponse.json(deleteService(v.id, serviceId));
  } catch (err) {
    return bookingErrorResponse(err);
  }
}
