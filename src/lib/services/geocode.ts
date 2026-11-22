import type { LatLng } from '@/lib/delivery-fee';

// Addresses rarely change, so remember each lookup for the life of the server.
const cache = new Map<string, LatLng | null>();

/** A free-text Nigerian address → coordinates (OpenStreetMap Nominatim). Null if it can't be placed. */
export async function geocodeAddress(address: string): Promise<LatLng | null> {
  const key = address.trim().toLowerCase();
  if (!key) return null;
  if (cache.has(key)) return cache.get(key)!;
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=ng&q=${encodeURIComponent(address)}`,
      { headers: { 'User-Agent': 'Closebuy-Demo-App (contact: no-reply@closebuy.ng)' }, signal: AbortSignal.timeout(6000) },
    );
    if (!res.ok) return null; // don't cache a failed lookup: try again next time
    const match = ((await res.json()) as { lat: string; lon: string }[])[0];
    const pos = match ? { lat: parseFloat(match.lat), lng: parseFloat(match.lon) } : null;
    cache.set(key, pos);
    return pos;
  } catch {
    return null;
  }
}
