import { NextResponse } from 'next/server';
import { buildSuggestions, type PhotonFeature, type NominatimPlace } from '@/lib/address-search';

const UA = { 'User-Agent': 'Closebuy-Demo-App (contact: no-reply@closebuy.ng)' };

async function getJson<T>(url: string, headers?: Record<string, string>): Promise<T | null> {
  try {
    const res = await fetch(url, { headers, signal: AbortSignal.timeout(6000) });
    return res.ok ? ((await res.json()) as T) : null;
  } catch {
    return null;
  }
}

/**
 * Address search as the customer types: up to 6 specific addresses (house number, street, area, city).
 * Photon (OpenStreetMap, built for type-ahead) first, Nominatim as a fallback. No API key needed.
 * `lat`/`lon` (optional) bias results towards where the customer is.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get('q') ?? '').trim().slice(0, 160);
  if (q.length < 3) return NextResponse.json({ suggestions: [] });
  const lat = Number(searchParams.get('lat'));
  const lon = Number(searchParams.get('lon'));
  const bias = Number.isFinite(lat) && Number.isFinite(lon) && (lat || lon) ? `&lat=${lat}&lon=${lon}` : '&lat=6.5244&lon=3.3792';

  const photon = await getJson<{ features?: PhotonFeature[] }>(
    `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=8&lang=en${bias}&bbox=2.6,4.2,14.7,13.9`,
    UA,
  );
  let suggestions = buildSuggestions(q, { photon: photon?.features ?? [] });
  if (!suggestions.length) {
    const nominatim = await getJson<NominatimPlace[]>(
      `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=6&countrycodes=ng&q=${encodeURIComponent(q)}`,
      UA,
    );
    suggestions = buildSuggestions(q, { nominatim: nominatim ?? [] });
  }
  return NextResponse.json({ suggestions });
}
