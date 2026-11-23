/** Turning map-search results into clean, specific Nigerian addresses for type-ahead. */

export type AddressSuggestion = { address: string; latitude: number; longitude: number };

export type PhotonFeature = {
  geometry?: { coordinates?: [number, number] };
  properties?: { name?: string; housenumber?: string; street?: string; district?: string; locality?: string; suburb?: string; city?: string; county?: string; state?: string; countrycode?: string };
};
export type NominatimPlace = {
  lat: string; lon: string; name?: string;
  address?: { house_number?: string; road?: string; suburb?: string; neighbourhood?: string; city_district?: string; city?: string; town?: string; county?: string; state?: string; country_code?: string };
};

/** The house number the customer typed at the start, e.g. "12" in "12 Admiralty Way", or "12B". */
export function typedHouseNumber(q: string): string | null {
  const m = q.trim().match(/^(\d+[a-zA-Z]?)(?:[\s,]+)/);
  return m ? m[1] : null;
}

function join(parts: (string | undefined | null)[]): string {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const p of parts) {
    const t = p?.trim();
    if (t && !seen.has(t.toLowerCase())) { seen.add(t.toLowerCase()); out.push(t); }
  }
  return out.join(', ');
}

export function buildSuggestions(q: string, src: { photon?: PhotonFeature[]; nominatim?: NominatimPlace[] }): AddressSuggestion[] {
  const typedNo = typedHouseNumber(q);
  const list: AddressSuggestion[] = [];
  for (const f of src.photon ?? []) {
    const p = f.properties ?? {};
    const c = f.geometry?.coordinates;
    if (!c || (p.countrycode && p.countrycode.toUpperCase() !== 'NG')) continue;
    const street = p.street ?? (p.name && !p.housenumber ? p.name : undefined);
    // Keep the number the customer typed when the map only knows the street.
    const number = p.housenumber ?? (typedNo && street ? typedNo : undefined);
    const line1 = street ? join([number ? `${number} ${street}` : street]) : p.name;
    const named = p.name && p.name !== street && p.name !== line1 ? p.name : undefined;
    list.push({ address: join([named, line1, p.district ?? p.suburb ?? p.locality, p.city ?? p.county, p.state]), latitude: c[1], longitude: c[0] });
  }
  for (const r of src.nominatim ?? []) {
    const a = r.address ?? {};
    if (a.country_code && a.country_code !== 'ng') continue;
    const number = a.house_number ?? (typedNo && a.road ? typedNo : undefined);
    const line1 = a.road ? (number ? `${number} ${a.road}` : a.road) : r.name;
    const named = r.name && r.name !== a.road ? r.name : undefined;
    list.push({ address: join([named, line1, a.suburb ?? a.neighbourhood ?? a.city_district, a.city ?? a.town ?? a.county, a.state]), latitude: parseFloat(r.lat), longitude: parseFloat(r.lon) });
  }
  const seen = new Set<string>();
  return list.filter((s) => s.address && !seen.has(s.address.toLowerCase()) && seen.add(s.address.toLowerCase())).slice(0, 6);
}
