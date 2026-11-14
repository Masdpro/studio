import { NextResponse } from 'next/server';
import { bookingsForProvider, runBookingJobs } from '@/lib/services/bookings';
import { providerOr401 } from '@/lib/booking-api';

export const dynamic = 'force-dynamic';

/** The signed-in provider's bookings. */
export async function GET() {
  const v = await providerOr401();
  if ('res' in v) return v.res;
  await runBookingJobs(); // lapse overdue requests before showing them
  return NextResponse.json({ bookings: bookingsForProvider(v.id), now: Date.now() });
}
