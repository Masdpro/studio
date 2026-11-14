import { NextResponse } from 'next/server';
import { runBookingJobs } from '@/lib/services/bookings';
import { providerSummary } from '@/lib/services/providers';
import { providerOr401 } from '@/lib/booking-api';

export const dynamic = 'force-dynamic';

/** The provider dashboard: profile, bookings to answer, what's coming up and this month's earnings. */
export async function GET() {
  const v = await providerOr401();
  if ('res' in v) return v.res;
  await runBookingJobs();
  const summary = providerSummary(v.id);
  if (!summary) return NextResponse.json({ error: 'Service business not found.' }, { status: 404 });
  return NextResponse.json({ summary });
}
