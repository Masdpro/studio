import { NextResponse } from 'next/server';
import { bookableDates, getService, isListedProvider } from '@/lib/services/bookings';
import { listedProviders } from '@/lib/services/providers';

export const dynamic = 'force-dynamic';

/**
 * GET -> every listed service business with its bookable services.
 * GET ?serviceId= -> the dates that service's business is open (for the booking dialog).
 */
export async function GET(request: Request) {
  const serviceId = new URL(request.url).searchParams.get('serviceId');
  if (serviceId) {
    const s = getService(serviceId);
    if (!s || s.paused || !isListedProvider(s.providerId)) return NextResponse.json({ error: 'This service is no longer available.' }, { status: 404 });
    return NextResponse.json({ dates: bookableDates(s.providerId) });
  }
  return NextResponse.json({ providers: listedProviders() });
}
