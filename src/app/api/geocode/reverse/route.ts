import { NextResponse } from 'next/server';

/**
 * Turns coordinates into a short, human-readable place name using OpenStreetMap's
 * free Nominatim service (no API key needed). Proxied through our own server so we
 * can send the identifying User-Agent Nominatim's usage policy requires — browsers
 * won't let client-side fetch() set that header.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get('lat');
  const lon = searchParams.get('lon');

  if (!lat || !lon) {
    return NextResponse.json({ error: 'lat and lon query params are required.' }, { status: 400 });
  }

  const res = await fetch(
    `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}`,
    { headers: { 'User-Agent': 'Closebuy-Demo-App (contact: no-reply@closebuy.ng)' } }
  );

  if (!res.ok) {
    return NextResponse.json({ error: 'Failed to resolve address.' }, { status: 502 });
  }

  const data = await res.json();
  const a = data.address ?? {};
  const neighborhood = a.suburb || a.neighbourhood || a.city_district || a.road;
  const city = a.city || a.town || a.village || a.county;
  const state = a.state;

  const address = [neighborhood, city, state].filter(Boolean).join(', ') || data.display_name || 'your area';

  return NextResponse.json({ address });
}
