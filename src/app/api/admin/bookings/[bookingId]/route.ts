import { NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/admin-guard';
import { adminComplete, BookingError, cancelBooking } from '@/lib/services/bookings';
import { bookingErrorResponse, readJson } from '@/lib/booking-api';

type Ctx = { params: Promise<{ bookingId: string }> };

/** { action: cancel (full refund) | complete (pays the vendor), reason } */
export async function POST(request: Request, ctx: Ctx) {
  const admin = await requireAdminSession();
  if (!admin) return NextResponse.json({ error: 'Admin access required.' }, { status: 403 });
  const { bookingId } = await ctx.params;
  const body = await readJson(request);
  const reason = typeof body.reason === 'string' ? body.reason.slice(0, 300) : '';
  try {
    if (body.action === 'cancel') return NextResponse.json(await cancelBooking('admin', 'admin', bookingId, { reason }));
    if (body.action === 'complete') return NextResponse.json({ booking: await adminComplete(bookingId, reason) });
    throw new BookingError('Unknown action.');
  } catch (err) {
    return bookingErrorResponse(err);
  }
}
