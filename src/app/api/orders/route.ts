import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createOrder, getOrdersForCustomer, getOrdersForVendor, getOrdersForDeliveryAgent } from '@/lib/services/orders';
import { getVendorById } from '@/lib/services/vendors';
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
        ? await getOrdersForDeliveryAgent(id)
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

  const orderIds: string[] = [];
  for (const [vendorId, vendorItems] of itemsByVendor) {
    const vendor = await getVendorById(vendorId);
    const itemsTotal = vendorItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const deliveryFee = deliveryPreference === 'delivery' ? 1500 : 0;

    const orderId = await createOrder({
      customerId: session.user.id,
      vendorId,
      items: vendorItems,
      totalAmount: itemsTotal + deliveryFee,
      status: 'Pending',
      pickupAddress: vendor
        ? `${vendor.businessName}, ${vendor.streetAddress}, ${vendor.city}`
        : 'Vendor address unavailable',
      deliveryAddress,
      deliveryFee,
      deliveryPreference,
    });
    orderIds.push(orderId);
  }

  return NextResponse.json({ orderIds }, { status: 201 });
}
