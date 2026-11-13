import { NextResponse } from 'next/server';
import { BookingError, cancelBooking, customerCancelTerms, getBooking, rescheduleBooking } from '@/lib/services/bookings';
import { bookingErrorResponse, readJson, signedInId } from '@/lib/booking-api';

type Ctx = { params: Promise<{ bookingId: string }> };

/** What cancelling now would refund. */
export async function GET(_request: Request, ctx: Ctx) {
  const id = await signedInId();
  if (!id) return NextResponse.json({ error: 'Sign-in required.' }, { status: 401 });
  const { bookingId } = await ctx.params;
  const b = getBooking(bookingId);
  if (!b || b.customerId !== id) return NextResponse.json({ error: 'Booking not found.' }, { status: 404 });
  return NextResponse.json({ terms: customerCancelTerms(b) });
}

/** { action: cancel | reschedule, startsAt? } */
export async function POST(request: Request, ctx: Ctx) {
  const id = await signedInId();
  if (!id) return NextResponse.json({ error: 'Sign-in required.' }, { status: 401 });
  const { bookingId } = await ctx.params;
  const body = await readJson(request);
  try {
    if (body.action === 'cancel') {
      const { booking, refund, vendorKeeps } = await cancelBooking('customer', id, bookingId);
      return NextResponse.json({ booking: { ...booking, completionCode: '' }, refund, vendorKeeps });
    }
    if (body.action === 'reschedule') return NextResponse.json({ booking: await rescheduleBooking('customer', id, bookingId, Number(body.startsAt)) });
    throw new BookingError('Unknown action.');
  } catch (err) {
    return bookingErrorResponse(err);
  }
}
