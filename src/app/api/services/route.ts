import { NextResponse } from 'next/server';
import { bookableDates, bookableServices, getServiceSettings } from '@/lib/services/bookings';

export const dynamic = 'force-dynamic';

/** GET ?vendorId= -> the services customers can book at that store, and the dates it's open. */
export async function GET(request: Request) {
  const vendorId = new URL(request.url).searchParams.get('vendorId') ?? '';
  const list = bookableServices(vendorId);
  return NextResponse.json({
    services: list.map(({ paused: _p, ...s }) => s),
    dates: list.length ? bookableDates(vendorId) : [],
    instantBooking: getServiceSettings(vendorId).instantBooking,
  });
}
