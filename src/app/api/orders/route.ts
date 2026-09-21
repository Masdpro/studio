import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  createOrder,
  getOrdersForCustomer,
  getOrdersForVendor,
  getOrdersForDeliveryAgent,
  getUnassignedReadyForPickupOrders,
} from '@/lib/services/orders';
import { getVendorById } from '@/lib/services/vendors';
import { debitWallet } from '@/lib/services/wallets';
import { createNotification } from '@/lib/services/notifications';
import type { CartItem } from '@/lib/types';

/** Returns orders relevant to the signed-in user, based on their role. */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'You must be signed in.' }, { status: 401 });
  }

  const { id, role } = session.user;
  const orders =
    role === 'vendor'
      ? await getOrdersForVendor(id)
      : role === 'delivery_agent'
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
  const { items, deliveryPreference, deliveryAddress } = body as {
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
  const vendorOrders = await Promise.all(
    Array.from(itemsByVendor.entries()).map(async ([vendorId, vendorItems]) => {
      const vendor = await getVendorById(vendorId);
      const itemsTotal = vendorItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
      const deliveryFee = deliveryPreference === 'delivery' ? 1500 : 0;
      return {
        vendorId,
        vendorItems,
        totalAmount: itemsTotal + deliveryFee,
        deliveryFee,
        pickupAddress: vendor
          ? `${vendor.businessName}, ${vendor.streetAddress}, ${vendor.city}`
          : 'Vendor address unavailable',
      };
    })
  );

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
    });
    orderIds.push(orderId);

    await createNotification({
      userId: session.user.id,
      message: `Your order for ₦${order.totalAmount.toLocaleString()} has been placed.`,
      category: 'Transaction',
      link: '/orders',
      iconName: 'ShoppingBag',
    });
    await createNotification({
      userId: order.vendorId,
      message: `You have a new order for ₦${order.totalAmount.toLocaleString()}.`,
      category: 'Activity',
      link: '/vendor/dashboard',
      iconName: 'PackageCheck',
    });
  }

  return NextResponse.json({ orderIds }, { status: 201 });
}
