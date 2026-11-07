import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getOrderById } from '@/lib/services/orders';
import { getDeliveryCode } from '@/lib/services/delivery-codes';

/** The delivery code for one of the signed-in customer's own orders. Never shown to vendors or agents. */
export async function GET(_request: Request, { params }: { params: Promise<{ orderId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'You must be signed in.' }, { status: 401 });
  const { orderId } = await params;
  const order = await getOrderById(orderId);
  if (!order || order.customerId !== session.user.id) return NextResponse.json({ error: 'Order not found.' }, { status: 404 });
  if (order.deliveryPreference !== 'delivery' || order.status === 'Delivered' || order.status === 'Cancelled') {
    return NextResponse.json({ code: null });
  }
  return NextResponse.json({ code: getDeliveryCode(orderId) });
}
