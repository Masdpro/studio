import type { Order } from '@/lib/types';
import { getVendorById } from '@/lib/services/vendors';
import { getBranchById } from '@/lib/services/branches';
import { getDeliveryAgentById } from '@/lib/services/deliveryAgents';
import { getDisplayName } from '@/lib/roles';

import { distanceKm, type LatLng } from '@/lib/delivery-fee';
import { geocodeAddress } from '@/lib/services/geocode';
import { shopPosition } from '@/lib/services/delivery-quote';

export type { LatLng };
export { distanceKm };

/** Everything the live tracking screen shows, in one response. */
export type OrderTracking = {
  orderId: string;
  status: Order['status'];
  /** Progress bar: how many of `total` steps are done (0 when cancelled). */
  step: number;
  total: number;
  headline: string;
  firstName: string | null;
  shop: { name: string; position: LatLng | null } | null;
  destination: LatLng | null;
  rider: { name: string; whatsapp: string | null; position: LatLng | null; updatedAt: string | null } | null;
  /** Estimated minutes until the rider reaches the customer, when it can be worked out. */
  etaMinutes: number | null;
  live: boolean;
};

/** Delivery steps, in order. The bar fills one segment per step reached. */
const STEPS: { statuses: Order['status'][]; headline: string }[] = [
  { statuses: ['Pending'], headline: 'Your order has been placed' },
  { statuses: ['Processing'], headline: 'Your order is now processing' },
  { statuses: ['ReadyForPickup'], headline: 'Your order is ready, finding a rider' },
  { statuses: ['AcceptedByAgent'], headline: 'Your rider is heading to the shop' },
  { statuses: ['PickedUpByAgent', 'Out for Delivery'], headline: 'Your order is on the way' },
  { statuses: ['Delivered'], headline: 'Your order has been delivered' },
];

/** Nigerian numbers in any common format → the international digits WhatsApp links need (e.g. 2348012345678). */
export function whatsappNumber(phone: string | null | undefined): string | null {
  const digits = (phone ?? '').replace(/\D/g, '');
  if (!digits) return null;
  if (digits.startsWith('234') && digits.length === 13) return digits;
  if (digits.startsWith('0') && digits.length === 11) return `234${digits.slice(1)}`;
  if (digits.length === 10) return `234${digits}`;
  return digits.length >= 10 ? digits : null;
}

/**
 * Rough riding time: roads are ~1.4× the straight line, an average Lagos okada/bike speed of ~18 km/h,
 * plus a couple of minutes to park and hand over.
 */
export function rideMinutes(from: LatLng, to: LatLng): number {
  return Math.max(2, Math.round((distanceKm(from, to) * 1.4 * 60) / 18 + 2));
}

const at = (lat?: number | null, lng?: number | null): LatLng | null => (lat != null && lng != null ? { lat, lng } : null);

export async function getOrderTracking(order: Order): Promise<OrderTracking> {
  const stepIndex = STEPS.findIndex((s) => s.statuses.includes(order.status));
  const cancelled = order.status === 'Cancelled';

  const vendor = await getVendorById(order.vendorId);
  const branch = order.branchId ? await getBranchById(order.branchId) : undefined;
  const shopPos = at(branch?.latitude, branch?.longitude) ?? at(vendor?.latitude, vendor?.longitude) ?? (await shopPosition(order.vendorId, order.branchId ?? undefined));
  const shop = vendor ? { name: vendor.businessName, position: shopPos } : null;

  const agent = order.deliveryAgentId ? await getDeliveryAgentById(order.deliveryAgentId) : undefined;
  const riderPos = at(order.agentLatitude, order.agentLongitude);
  const rider = agent
    ? {
        name: agent.name,
        whatsapp: whatsappNumber(agent.phone),
        position: riderPos,
        updatedAt: order.agentLocationUpdatedAt ? new Date(order.agentLocationUpdatedAt).toISOString() : null,
      }
    : null;

  const destination = order.deliveryPreference === 'delivery' ? await geocodeAddress(order.deliveryAddress) : null;

  // ETA: from the rider's live position once they have the order; before that, shop → door.
  let etaMinutes: number | null = null;
  const onTheWay = order.status === 'PickedUpByAgent' || order.status === 'Out for Delivery';
  if (destination && onTheWay && riderPos) etaMinutes = rideMinutes(riderPos, destination);
  else if (destination && shopPos && stepIndex >= 0 && stepIndex < 4) {
    const toShop = riderPos && order.status === 'AcceptedByAgent' ? rideMinutes(riderPos, shopPos) : 10;
    const prep = order.status === 'Pending' || order.status === 'Processing' ? 15 : 0;
    etaMinutes = prep + toShop + rideMinutes(shopPos, destination);
  }

  return {
    orderId: order.id,
    status: order.status,
    step: cancelled ? 0 : stepIndex + 1,
    total: STEPS.length,
    headline: cancelled ? 'This order was cancelled' : STEPS[stepIndex]?.headline ?? 'Tracking your order',
    firstName: getDisplayName(order.customerId)?.split(/[\s@]/)[0] ?? null,
    shop,
    destination,
    rider,
    etaMinutes: order.status === 'Delivered' || cancelled ? null : etaMinutes,
    live: onTheWay && !!riderPos,
  };
}
