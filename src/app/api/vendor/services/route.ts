import { NextResponse } from 'next/server';
import { createService, listServices } from '@/lib/services/bookings';
import { bookingErrorResponse, readJson, vendorOr401 } from '@/lib/booking-api';

/** The signed-in vendor's services, paused ones included. */
export async function GET() {
  const v = await vendorOr401();
  if ('res' in v) return v.res;
  return NextResponse.json({ services: listServices(v.id, { includePaused: true }) });
}

/** Adds a service. */
export async function POST(request: Request) {
  const v = await vendorOr401({ trading: true });
  if ('res' in v) return v.res;
  try {
    return NextResponse.json({ service: createService(v.id, (await readJson(request)) as any) }, { status: 201 });
  } catch (err) {
    return bookingErrorResponse(err);
  }
}
