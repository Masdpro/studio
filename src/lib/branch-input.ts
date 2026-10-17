import type { VendorBranch } from '@/lib/types';

const STATUSES = ['Open', 'Closed', 'Opening Soon', 'Temporarily Unavailable'] as const;
const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : undefined);

/** Validates a branch payload. Returns the cleaned fields or an error message. */
export function parseBranchInput(body: any, partial = false): { data: Partial<Omit<VendorBranch, 'id' | 'vendorId'>> } | { error: string } {
  if (!body || typeof body !== 'object') return { error: 'Invalid request.' };
  const data: Partial<Omit<VendorBranch, 'id' | 'vendorId'>> = {};
  for (const [key, max] of [['name', 80], ['streetAddress', 200], ['city', 80], ['country', 80]] as const) {
    if (body[key] !== undefined || !partial) {
      const v = str(body[key], max);
      if (!v) return { error: `${key === 'streetAddress' ? 'Street address' : key[0].toUpperCase() + key.slice(1)} is required.` };
      data[key] = v;
    }
  }
  for (const [key, max] of [['locationTag', 80], ['marketId', 64], ['phone', 30], ['operatingHours', 120]] as const) {
    if (body[key] !== undefined) data[key] = str(body[key], max) || undefined;
  }
  if (body.status !== undefined) {
    if (!STATUSES.includes(body.status)) return { error: 'Invalid status.' };
    data.status = body.status;
  }
  if (body.imageUrl !== undefined) {
    const u = str(body.imageUrl, 200);
    if (u && !/^\/api\/uploads\/[0-9a-f-]{36}\.(jpg|png|gif|webp)$/.test(u)) return { error: 'Invalid image.' };
    data.imageUrl = u;
  }
  const lat = num(body.latitude), lon = num(body.longitude);
  if (lat !== undefined || lon !== undefined) {
    if (lat === undefined || lon === undefined || Math.abs(lat) > 90 || Math.abs(lon) > 180) return { error: 'Invalid coordinates.' };
    data.latitude = lat;
    data.longitude = lon;
  }
  return { data };
}

/** Best-effort address → coordinates (OpenStreetMap Nominatim); never throws. */
export async function geocode(address: string): Promise<{ latitude: number; longitude: number } | null> {
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=ng&q=${encodeURIComponent(address)}`, {
      headers: { 'User-Agent': 'Closebuy-Demo-App (contact: no-reply@closebuy.ng)' },
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return null;
    const m = (await res.json())[0];
    return m ? { latitude: parseFloat(m.lat), longitude: parseFloat(m.lon) } : null;
  } catch {
    return null;
  }
}
