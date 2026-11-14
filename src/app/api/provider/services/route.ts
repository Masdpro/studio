import { NextResponse } from 'next/server';
import { createService, listServices } from '@/lib/services/bookings';
import { portfolioFor } from '@/lib/services/providers';
import { bookingErrorResponse, providerOr401, readJson } from '@/lib/booking-api';

/** The signed-in provider's services (paused ones included), each with its portfolio photos. */
export async function GET() {
  const v = await providerOr401();
  if ('res' in v) return v.res;
  const services = listServices(v.id, { includePaused: true }).map((s) => ({ ...s, portfolio: portfolioFor(s.id) }));
  return NextResponse.json({ services });
}

/** Adds a service. */
export async function POST(request: Request) {
  const v = await providerOr401({ trading: true });
  if ('res' in v) return v.res;
  try {
    return NextResponse.json({ service: { ...createService(v.id, (await readJson(request)) as any), portfolio: [] } }, { status: 201 });
  } catch (err) {
    return bookingErrorResponse(err);
  }
}
