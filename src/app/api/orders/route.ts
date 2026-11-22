import { userHasRole, getBranchForUser, ownBusinessId, getDisplayName } from '@/lib/roles';
import { NextResponse } from 'next/server';
import { quoteDelivery } from '@/lib/services/delivery-quote';
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
import { applyEntry, InsufficientFundsError } from '@/lib/services/wallets';
import { db } from '@/db';
import { randomUUID } from 'crypto';
import { createNotification } from '@/lib/services/notifications';
import type { CartItem } from '@/lib/types';
import { recordEvent } from '@/lib/services/events';
import { getBranchById } from '@/lib/services/branches';
import { getProductById, reserveStock, releaseStock, suspendedVendorIds } from '@/lib/services/products';
import { availableFor, getStockRows, type StockLine } from '@/lib/services/stock';

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

  // Names to show instead of account ids: the shop (for customers and riders), the customer
  // (for shops: first name only) and the rider.
  const shopNames = new Map<string, string | undefined>();
  for (const vid of new Set(orders.map((o) => o.vendorId))) shopNames.set(vid, (await getVendorById(vid))?.businessName);
  const firstName = (id?: string) => (id ? getDisplayName(id)?.split(/[\s@]/)[0] : undefined);
  const named = orders.map((o) => ({
    ...o,
    vendorName: shopNames.get(o.vendorId),
    customerName: firstName(o.customerId),
    agentName: firstName(o.deliveryAgentId),
  }));
  return NextResponse.json({ orders: named });
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

  if (!Array.isArray(items) || !items.length) {
    return NextResponse.json({ error: 'Your cart is empty.' }, { status: 400 });
  }
  if (items.length > 100) {
    return NextResponse.json({ error: 'Too many items in one order.' }, { status: 400 });
  }
  if (typeof deliveryAddress !== 'string' || !deliveryAddress.trim()) {
    return NextResponse.json({ error: 'A delivery/pickup address is required.' }, { status: 400 });
  }

  // Never trust the browser's copy of the cart for money: price, vendor and name
  // come from the product record, quantities must be sensible whole numbers,
  // and colour/size must be one the vendor actually offers.
  const cleanItems: CartItem[] = [];
  // Nobody orders from their own business (their store or the store their branch login belongs to).
  const ownVendorId = ownBusinessId(session.user.id);
  const suspended = suspendedVendorIds();
  const qtyByProduct = new Map<string, number>();
  for (const item of items) {
    const product = item?.productId ? await getProductById(String(item.productId)) : undefined;
    if (!product) {
      return NextResponse.json({ error: `${item?.name ?? 'An item'} is no longer available. Please remove it from your cart.` }, { status: 400 });
    }
    if (ownVendorId && product.vendorId === ownVendorId) {
      return NextResponse.json(
        { error: `${product.name} is from your own store, and you can't order from your own business. Please remove it from your cart.`, code: 'OWN_STORE', productId: product.id },
        { status: 400 }
      );
    }
    if (suspended.has(product.vendorId) || product.paused) {
      return NextResponse.json({ error: `${product.name} is no longer available. Please remove it from your cart.` }, { status: 400 });
    }
    const quantity = Math.floor(Number(item.quantity));
    if (!Number.isFinite(quantity) || quantity < 1 || quantity > 999) {
      return NextResponse.json({ error: `Please choose a valid quantity for ${product.name}.` }, { status: 400 });
    }
    const pick = (offered: string[] | undefined, chosen: unknown, label: string) => {
      if (!offered?.length) return { value: undefined as string | undefined };
      const match = typeof chosen === 'string' ? offered.find((o) => o.toLowerCase() === chosen.trim().toLowerCase()) : undefined;
      return match ? { value: match } : { error: `Please choose a ${label} for ${product.name}.` };
    };
    const color = pick(product.colors, item.color, 'colour');
    const size = pick(product.sizes, item.size, 'size');
    const optionError = color.error ?? size.error;
    if (optionError) return NextResponse.json({ error: optionError }, { status: 400 });

    // Stock is checked for the exact colour/size, at the branch the customer collects from.
    const optionKey = `${product.id}\u0000${color.value ?? ''}\u0000${size.value ?? ''}`;
    qtyByProduct.set(optionKey, (qtyByProduct.get(optionKey) ?? 0) + quantity);
    if (product.stock !== undefined) {
      const wanted = branchSelections?.[product.vendorId];
      const available = availableFor(getStockRows(product.id), { location: wanted && wanted !== 'main' ? wanted : 'main', color: color.value, size: size.value }) ?? product.stock;
      if (qtyByProduct.get(optionKey)! > available) {
        const label = [color.value, size.value].filter(Boolean).join(' / ');
        const what = label ? `${product.name} (${label})` : product.name;
        return NextResponse.json(
          { error: available === 0 ? `${what} is sold out${wanted && wanted !== 'main' ? ' at that branch' : ''}.` : `Only ${available} of ${what} left. Please reduce the quantity.`, code: 'OUT_OF_STOCK', productId: product.id, available },
          { status: 409 }
        );
      }
    }
    cleanItems.push({
      productId: product.id,
      vendorId: product.vendorId,
      name: product.name,
      price: product.discountPrice ?? product.price,
      quantity,
      imageUrl: product.imageUrl,
      ...(product.aiHint ? { aiHint: product.aiHint } : {}),
      ...(color.value ? { color: color.value } : {}),
      ...(size.value ? { size: size.value } : {}),
    });
  }

  const itemsByVendor = new Map<string, CartItem[]>();
  for (const item of cleanItems) {
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
      // Priced by distance from this shop (or the chosen branch) to the customer's door, capped at ₦1,000.
      const deliveryFee = deliveryPreference === 'delivery'
        ? (await quoteDelivery(deliveryAddress, [{ vendorId, branchId: branch?.id }])).quotes[0].fee
        : 0;
      return {
        vendorId,
        vendorItems,
        totalAmount: itemsTotal + deliveryFee,
        deliveryFee,
        branchId: branch?.id,
        branchName: branch?.name,
        orderId: randomUUID(),
        vendorName: vendor?.businessName ?? 'a vendor',
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

  // Hold the stock first (all or nothing), then charge; give the stock back if the charge fails.
  const stockLines: StockLine[] = vendorOrders.flatMap((o) =>
    o.vendorItems.map((i) => ({ productId: i.productId, quantity: i.quantity, location: o.branchId ?? 'main', color: i.color, size: i.size, orderId: o.orderId }))
  );
  const reserved = reserveStock(stockLines);
  if (!reserved.ok) {
    const p = await getProductById(reserved.productId);
    return NextResponse.json(
      { error: `${p?.name ?? 'An item'} just sold out or has fewer units left. Please update your cart.`, code: 'OUT_OF_STOCK', productId: reserved.productId, available: reserved.available },
      { status: 409 }
    );
  }

  try {
    // One wallet entry per order, all or nothing.
    db.transaction((tx) => {
      for (const o of vendorOrders) {
        applyEntry(tx, {
          id: `purchase:${o.orderId}`,
          userId: session.user.id,
          type: 'purchase',
          amount: -o.totalAmount,
          requireFunds: true,
          orderId: o.orderId,
          description: `Order from ${o.vendorName}`,
        });
      }
    });
  } catch (err) {
    releaseStock(stockLines);
    if (err instanceof InsufficientFundsError) {
      return NextResponse.json(
        { error: err.message, code: 'INSUFFICIENT_FUNDS', balance: err.balance, needed: err.needed, shortfall: err.needed - err.balance },
        { status: 402 }
      );
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Payment failed.' },
      { status: 402 }
    );
  }

  const orderIds: string[] = [];
  for (const order of vendorOrders) {
    const orderId = await createOrder({
      id: order.orderId,
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
