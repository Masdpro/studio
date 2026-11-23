/**
 * Delivery pricing: ₦1,000 covers the first 2 km of riding (shop → door), then ₦100 for each
 * further kilometre, rounded up to the nearest ₦50, never more than ₦2,500.
 * Shared by the server (what is charged) and the cart (what is shown), so they always agree.
 */
/**
 * For now every delivery is a flat ₦1,000 per shop (distance pricing confused shoppers).
 * Set to true to switch the distance-based pricing below back on.
 */
export const DISTANCE_PRICING = false;
export const FLAT_DELIVERY_FEE = 1000;

export const DELIVERY_FEE_MIN = 1000;
export const DELIVERY_FEE_MAX = 2500;
const INCLUDED_KM = 2;
const PER_KM = 100;
/** Roads are longer than the straight line between two points. */
export const ROAD_FACTOR = 1.4;

/** Fee for a ride of `roadKm`, between the ₦1,000 minimum and the ₦2,500 cap. */
export function deliveryFeeForKm(roadKm: number): number {
  if (!Number.isFinite(roadKm) || roadKm < 0) return DELIVERY_FEE_MAX;
  const raw = DELIVERY_FEE_MIN + PER_KM * Math.max(0, roadKm - INCLUDED_KM);
  return Math.min(DELIVERY_FEE_MAX, Math.ceil(raw / 50) * 50);
}

export type LatLng = { lat: number; lng: number };

/** Straight-line distance in km. */
export function distanceKm(a: LatLng, b: LatLng): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Estimated riding distance between two points. */
export const roadKm = (a: LatLng, b: LatLng) => distanceKm(a, b) * ROAD_FACTOR;
