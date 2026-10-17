import { NextResponse } from 'next/server';

const UA = { 'User-Agent': 'Closebuy-Demo-App (contact: no-reply@closebuy.ng)' };

async function getJson(url: string, headers?: Record<string, string>) {
  try {
    const res = await fetch(url, { headers, signal: AbortSignal.timeout(6000) });
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  }
}

/** OpenStreetMap Nominatim: street-level first, then progressively coarser zoom levels. */
async function nominatim(lat: string, lon: string): Promise<string | null> {
  for (const zoom of [18, 16, 14]) {
    const data = await getJson(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=${zoom}&addressdetails=1&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}`,
      UA
    );
    if (!data || data.error) continue;
    const a = data.address ?? {};
    // Street-level detail first (house number + road, or the named building/amenity GPS landed on), then context.
    const street = [a.house_number, a.road].filter(Boolean).join(' ') || a.amenity || a.building;
    const neighborhood = a.suburb || a.neighbourhood || a.city_district;
    const city = a.city || a.town || a.village || a.county;
    const address = [street, neighborhood, city, a.state].filter(Boolean).join(', ') || data.display_name;
    if (address) return address;
  }
  return null;
}

/** BigDataCloud's free client reverse geocoder (no key) as a second opinion if Nominatim is unavailable. */
async function bigDataCloud(lat: string, lon: string): Promise<string | null> {
  const d = await getJson(
    `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${encodeURIComponent(lat)}&longitude=${encodeURIComponent(lon)}&localityLanguage=en`
  );
  if (!d) return null;
  const address = [d.locality, d.city, d.principalSubdivision].filter((x: string | undefined, i: number, arr: (string | undefined)[]) => x && arr.indexOf(x) === i).join(', ');
  return address || null;
}

/**
 * Turns coordinates into a short, human-readable place name. Proxied through our own server so we
 * can send the identifying User-Agent Nominatim's usage policy requires.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get('lat');
  const lon = searchParams.get('lon');

  if (!lat || !lon) {
    return NextResponse.json({ error: 'lat and lon query params are required.' }, { status: 400 });
  }

  const address = (await nominatim(lat, lon)) ?? (await bigDataCloud(lat, lon));
  if (!address) return NextResponse.json({ error: 'Failed to resolve address.' }, { status: 502 });
  return NextResponse.json({ address });
}
