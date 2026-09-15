import { NextResponse } from 'next/server';

/**
 * Turns a free-text address into coordinates using OpenStreetMap's free Nominatim
 * service (no API key needed). Proxied so we can send the identifying User-Agent
 * Nominatim's usage policy requires — browser fetch() can't set that header.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get('address');

  if (!address?.trim()) {
    return NextResponse.json({ error: 'address query param is required.' }, { status: 400 });
  }

  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=ng&q=${encodeURIComponent(address)}`,
    { headers: { 'User-Agent': 'Closebuy-Demo-App (contact: no-reply@closebuy.ng)' } }
  );

  if (!res.ok) {
    return NextResponse.json({ error: 'Failed to resolve address.' }, { status: 502 });
  }

  const results = await res.json();
  const match = results[0];
  if (!match) {
    return NextResponse.json({ error: 'No match found for that address.' }, { status: 404 });
  }

  return NextResponse.json({ latitude: parseFloat(match.lat), longitude: parseFloat(match.lon) });
}
