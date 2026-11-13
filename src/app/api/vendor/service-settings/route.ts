import { NextResponse } from 'next/server';
import { getServiceSettings, saveServiceSettings } from '@/lib/services/bookings';
import { bookingErrorResponse, readJson, vendorOr401 } from '@/lib/booking-api';

/** Opening hours, days off, how many at once and instant booking. */
export async function GET() {
  const v = await vendorOr401();
  if ('res' in v) return v.res;
  return NextResponse.json({ settings: getServiceSettings(v.id) });
}

export async function PUT(request: Request) {
  const v = await vendorOr401();
  if ('res' in v) return v.res;
  try {
    return NextResponse.json({ settings: saveServiceSettings(v.id, (await readJson(request)) as any) });
  } catch (err) {
    return bookingErrorResponse(err);
  }
}
