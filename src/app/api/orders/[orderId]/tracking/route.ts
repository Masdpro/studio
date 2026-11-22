import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getOrderById } from '@/lib/services/orders';
import { getOrderTracking } from '@/lib/services/order-tracking';

/** Live tracking for the customer who placed the order: progress, shop, rider and their position, ETA. */
export async function GET(_request: Request, { params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'You must be signed in.' }, { status: 401 });
  }
  const order = await getOrderById(orderId);
  if (!order) {
    return NextResponse.json({ error: 'Order not found.' }, { status: 404 });
  }
  if (order.customerId !== session.user.id) {
    return NextResponse.json({ error: 'Only the customer who placed this order can track it.' }, { status: 403 });
  }
  return NextResponse.json({ tracking: await getOrderTracking(order) });
}
