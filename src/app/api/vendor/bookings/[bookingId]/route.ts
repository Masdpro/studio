import { NextResponse } from 'next/server';
import { acceptBooking, BookingError, cancelBooking, completeBooking, declineBooking, markNoShow, rescheduleBooking } from '@/lib/services/bookings';
import { bookingErrorResponse, readJson, vendorOr401 } from '@/lib/booking-api';

type Ctx = { params: Promise<{ bookingId: string }> };

/** { action: accept | decline | cancel | reschedule | complete | noshow, startsAt?, code?, reason? } */
export async function POST(request: Request, ctx: Ctx) {
  const v = await vendorOr401();
  if ('res' in v) return v.res;
  const { bookingId } = await ctx.params;
  const body = await readJson(request);
  const reason = typeof body.reason === 'string' ? body.reason.slice(0, 300) : undefined;
  try {
    switch (body.action) {
      case 'accept': return NextResponse.json({ booking: await acceptBooking(v.id, bookingId) });
      case 'decline': return NextResponse.json({ booking: await declineBooking(v.id, bookingId, reason) });
      case 'cancel': return NextResponse.json((await cancelBooking('vendor', v.id, bookingId, { reason })));
      case 'reschedule': return NextResponse.json({ booking: await rescheduleBooking('vendor', v.id, bookingId, Number(body.startsAt)) });
      case 'complete': return NextResponse.json({ booking: await completeBooking(v.id, bookingId, body.code) });
      case 'noshow': return NextResponse.json({ booking: await markNoShow(v.id, bookingId) });
      default: throw new BookingError('Unknown action.');
    }
  } catch (err) {
    return bookingErrorResponse(err);
  }
}
