import type { Vendor, VendorBranch } from '@/lib/types';

export const NEARBY_DEGREES = 0.05;

export type LocationFilter = { value: string; all: string; current: string; coords: { latitude: number; longitude: number } | null };

/** Every place a vendor trades from: its main address plus any branches. */
export function vendorPlaces(v: Vendor, branches: VendorBranch[]) {
  return [
    { locationTag: v.locationTag, latitude: v.latitude, longitude: v.longitude, text: [v.businessName, v.city, v.streetAddress, v.locationTag] },
    ...branches.map((b) => ({ locationTag: b.locationTag, latitude: b.latitude, longitude: b.longitude, text: [b.name, b.city, b.streetAddress, b.locationTag] })),
  ];
}

/** Does the vendor (main address or any branch) match the free-text query? */
export function vendorMatchesQuery(v: Vendor, branches: VendorBranch[], q: string): boolean {
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  return vendorPlaces(v, branches).some((p) => p.text.some((t) => t && t.toLowerCase().includes(needle)));
}

/** Does the vendor have at least one location inside the selected area / near the user? */
export function vendorInLocation(v: Vendor, branches: VendorBranch[], f: LocationFilter): boolean {
  if (f.value === f.all) return true;
  const places = vendorPlaces(v, branches);
  if (f.value === f.current) {
    if (!f.coords) return true;
    return places.some(
      (p) => p.latitude && p.longitude && Math.abs(p.latitude - f.coords!.latitude) < NEARBY_DEGREES && Math.abs(p.longitude - f.coords!.longitude) < NEARBY_DEGREES
    );
  }
  return places.some((p) => p.locationTag === f.value);
}
