import { userHasRole, getBranchForUser } from '@/lib/roles';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  createOrder,
  getOrdersForCustomer,
  getOrdersForVendor,
  getOrdersForBranch,
  getOrdersForDeliveryAgent,
  getUnassignedReadyForPickupOrders,
} from '@/lib/services/orders';
import { getVendorById } from '@/lib/services/vendors';
import { debitWallet } from '@/lib/services/wallets';
import { createNotification } from '@/lib/services/notifications';
import type { CartItem } from '@/lib/types';
import { recordEvent } from '@/lib/services/events';
import { getBranchById } from '@/lib/services/branches';

/** Returns orders relevant to the signed-in user, based on their role. */
export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'You must be signed in.' }, { status: 401 });
  }

  const { id } = session.user;
  const as = new URL(request.url).searchParams.get('as');
  const orders =
    as === 'branch' && getBranchForUser(id)
      ? await getOrdersForBranch(getBranchForUser(id)!.id)
      : as === 'vendor' && userHasRole(id, 'vendor')
      ? await getOrdersForVendor(id)
      : as === 'agent' && userHasRole(id, 'delivery_agent')
        ? [...(await getOrdersForDeliveryAgent(id)), ...(await getUnassignedReadyForPickupOrders())]
        : await getOrdersForCustomer(id);

  return NextResponse.json({ orders });
}

/**
 * Places an order. Cart items can span multiple vendors — each vendor's
 * items become their own Order row, since an Order has a single vendorId
 * (matching how pickup/delivery is organized in this app).
 */
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'You must be signed in to place an order.' }, { status: 401 });
  }

  const body = await request.json();
  const { items, deliveryPreference, deliveryAddress, sessionId, branchSelections } = body as {
    sessionId?: string;
    branchSelections?: Record<string, string>;
    items: CartItem[];
    deliveryPreference: 'delivery' | 'pickup';
    deliveryAddress: string;
  };

  if (!items?.length) {
    return NextResponse.json({ error: 'Your cart is empty.' }, { status: 400 });
  }
  if (!deliveryAddress?.trim()) {
    return NextResponse.json({ error: 'A delivery/pickup address is required.' }, { status: 400 });
  }

  const itemsByVendor = new Map<string, CartItem[]>();
  for (const item of items) {
    const vendorId = item.vendorId ?? 'unknown-vendor';
    if (!itemsByVendor.has(vendorId)) itemsByVendor.set(vendorId, []);
    itemsByVendor.get(vendorId)!.push(item);
  }

  // Resolve each vendor sub-order's total up front so we know the grand total
  // to charge the wallet before creating anything.
  let vendorOrders: Awaited<ReturnType<typeof resolveVendorOrders>>;
  try {
    vendorOrders = await resolveVendorOrders();
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Could not place order.' }, { status: 400 });
  }

  async function resolveVendorOrders() {
    return Promise.all(
    Array.from(itemsByVendor.entries()).map(async ([vendorId, vendorItems]) => {
      const vendor = await getVendorById(vendorId);
      // Customer may collect from one of the vendor's branches instead of its main address.
      const wanted = branchSelections?.[vendorId];
      const branch = wanted && wanted !== 'main' ? await getBranchById(wanted) : undefined;
      if (wanted && wanted !== 'main' && (!branch || branch.vendorId !== vendorId)) {
        throw new Error('That pickup branch is not available.');
      }
      const itemsTotal = vendorItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
      const deliveryFee = deliveryPreference === 'delivery' ? 1500 : 0;
      return {
        vendorId,
        vendorItems,
        totalAmount: itemsTotal + deliveryFee,
        deliveryFee,
        branchId: branch?.id,
        branchName: branch?.name,
        pickupAddress: branch
          ? `${vendor?.businessName ?? 'Vendor'} (${branch.name}), ${branch.streetAddress}, ${branch.city}`
          : vendor
            ? `${vendor.businessName}, ${vendor.streetAddress}, ${vendor.city}`
            : 'Vendor address unavailable',
      };
    })
    );
  }

  const grandTotal = vendorOrders.reduce((sum, o) => sum + o.totalAmount, 0);

  try {
    await debitWallet(session.user.id, grandTotal);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Payment failed.' },
      { status: 402 }
    );
  }

  const orderIds: string[] = [];
  for (const order of vendorOrders) {
    const orderId = await createOrder({
      customerId: session.user.id,
      vendorId: order.vendorId,
      items: order.vendorItems,
      totalAmount: order.totalAmount,
      status: 'Pending',
      pickupAddress: order.pickupAddress,
      deliveryAddress,
      deliveryFee: order.deliveryFee,
      deliveryPreference,
      branchId: order.branchId,
    });
    orderIds.push(orderId);
    recordEvent({
      type: 'order_placed',
      sessionId: typeof sessionId === 'string' && sessionId ? sessionId.slice(0, 64) : `server:${session.user.id}`,
      userId: session.user.id,
      vendorId: order.vendorId,
    });

    await createNotification({
      userId: session.user.id,
      message: `Your order for ₦${order.totalAmount.toLocaleString()} has been placed.`,
      category: 'Transaction',
      link: '/orders',
      iconName: 'ShoppingBag',
    });
    await createNotification({
      userId: order.vendorId,
      message: `You have a new order for ₦${order.totalAmount.toLocaleString()}${order.branchName ? ` (pickup at ${order.branchName})` : ''}.`,
      category: 'Activity',
      link: '/vendor/dashboard',
      iconName: 'PackageCheck',
    });
  }

  return NextResponse.json({ orderIds }, { status: 201 });
}
