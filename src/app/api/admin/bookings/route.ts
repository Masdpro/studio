import { NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/admin-guard';
import { bookingsForAdmin, runBookingJobs } from '@/lib/services/bookings';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (!(await requireAdminSession())) return NextResponse.json({ error: 'Admin access required.' }, { status: 403 });
  await runBookingJobs();
  return NextResponse.json({ bookings: bookingsForAdmin(), now: Date.now() });
}
