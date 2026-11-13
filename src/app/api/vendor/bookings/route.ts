import { NextResponse } from 'next/server';
import { bookingsForVendor, runBookingJobs } from '@/lib/services/bookings';
import { vendorOr401 } from '@/lib/booking-api';

export const dynamic = 'force-dynamic';

/** The signed-in vendor's bookings. */
export async function GET() {
  const v = await vendorOr401();
  if ('res' in v) return v.res;
  await runBookingJobs(); // lapse overdue requests before showing them
  return NextResponse.json({ bookings: bookingsForVendor(v.id), now: Date.now() });
}
