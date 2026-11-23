import { DELIVERY_FEE_MAX, DISTANCE_PRICING, FLAT_DELIVERY_FEE, deliveryFeeForKm, roadKm, type LatLng } from '@/lib/delivery-fee';
import { geocodeAddress } from '@/lib/services/geocode';
import { getVendorById } from '@/lib/services/vendors';
import { getBranchById } from '@/lib/services/branches';

export type ShopQuote = { vendorId: string; fee: number; km: number | null };

/**
 * Where a shop's order leaves from: the chosen branch, else the main address. Saved map coordinates
 * are used when present; otherwise the shop's street address is looked up on the map.
 */
export async function shopPosition(vendorId: string, branchId?: string): Promise<LatLng | null> {
  const branch = branchId && branchId !== 'main' ? await getBranchById(branchId) : undefined;
  if (branch?.latitude != null && branch.longitude != null) return { lat: branch.latitude, lng: branch.longitude };
  if (branch) {
    const found = await geocodeAddress(`${branch.streetAddress}, ${branch.city}`);
    if (found) return found;
  }
  const vendor = await getVendorById(vendorId);
  if (!vendor) return null;
  if (vendor.latitude != null && vendor.longitude != null) return { lat: vendor.latitude, lng: vendor.longitude };
  return geocodeAddress(`${vendor.streetAddress}, ${vendor.city}`);
}

/**
 * Delivery fee for each shop in an order, by how far the customer's address is from that shop.
 * If either end can't be placed on the map, the fee is the ₦2,500 cap.
 */
export async function quoteDelivery(address: string, shops: { vendorId: string; branchId?: string }[]): Promise<{ located: boolean; quotes: ShopQuote[] }> {
  if (!DISTANCE_PRICING) return { located: true, quotes: shops.map(({ vendorId }) => ({ vendorId, fee: FLAT_DELIVERY_FEE, km: null })) };
  const door = await geocodeAddress(address);
  const quotes = await Promise.all(
    shops.map(async ({ vendorId, branchId }) => {
      const from = door ? await shopPosition(vendorId, branchId) : null;
      if (!door || !from) return { vendorId, fee: DELIVERY_FEE_MAX, km: null };
      const km = roadKm(from, door);
      return { vendorId, fee: deliveryFeeForKm(km), km: Math.round(km * 10) / 10 };
    }),
  );
  return { located: !!door, quotes };
}
