import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getOrderById, updateOrderLocation } from '@/lib/services/orders';

/** The assigned delivery agent pings their live position while the order is out for delivery. */
export async function PATCH(request: Request, { params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'You must be signed in.' }, { status: 401 });
  }

  const order = await getOrderById(orderId);
  if (!order) {
    return NextResponse.json({ error: 'Order not found.' }, { status: 404 });
  }
  if (order.deliveryAgentId !== session.user.id) {
    return NextResponse.json({ error: 'You are not the delivery agent for this order.' }, { status: 403 });
  }

  const { latitude, longitude } = (await request.json()) as { latitude: number; longitude: number };
  if (typeof latitude !== 'number' || typeof longitude !== 'number') {
    return NextResponse.json({ error: 'latitude and longitude are required.' }, { status: 400 });
  }

  await updateOrderLocation(orderId, latitude, longitude);
  return NextResponse.json({ ok: true });
}
