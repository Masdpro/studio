import { NextResponse } from 'next/server';
import { bookingsForCustomer, createBooking, runBookingJobs } from '@/lib/services/bookings';
import { bookingErrorResponse, readJson, signedInId } from '@/lib/booking-api';

export const dynamic = 'force-dynamic';

/** The signed-in customer's bookings. */
export async function GET() {
  const id = await signedInId();
  if (!id) return NextResponse.json({ error: 'Sign-in required.' }, { status: 401 });
  await runBookingJobs();
  return NextResponse.json({ bookings: bookingsForCustomer(id), now: Date.now() });
}

/** Books a service: { serviceId, startsAt, location?, address?, note? }. Paid from the wallet. */
export async function POST(request: Request) {
  const id = await signedInId();
  if (!id) return NextResponse.json({ error: 'Please sign in to book.' }, { status: 401 });
  const body = await readJson(request);
  try {
    const booking = await createBooking({ customerId: id, serviceId: String(body.serviceId ?? ''), startsAt: Number(body.startsAt), location: body.location, address: body.address, note: body.note });
    return NextResponse.json({ booking: { ...booking, completionCode: booking.status === 'Confirmed' ? booking.completionCode : '' } }, { status: 201 });
  } catch (err) {
    return bookingErrorResponse(err);
  }
}
