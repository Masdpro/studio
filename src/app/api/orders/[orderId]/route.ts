import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getOrderById, updateOrderStatus } from '@/lib/services/orders';
import type { Order } from '@/lib/types';

/** Updates an order's status. Only the customer, vendor, or assigned delivery agent may do so. */
export async function PATCH(request: Request, { params }: { params: { orderId: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'You must be signed in.' }, { status: 401 });
  }

  const order = await getOrderById(params.orderId);
  if (!order) {
    return NextResponse.json({ error: 'Order not found.' }, { status: 404 });
  }

  const { id: userId } = session.user;
  const isParticipant = order.customerId === userId || order.vendorId === userId || order.deliveryAgentId === userId;
  if (!isParticipant) {
    return NextResponse.json({ error: 'You do not have access to this order.' }, { status: 403 });
  }

  const body = await request.json();
  const { status, ...extra } = body as { status: Order['status'] } & Partial<Order>;
  if (!status) {
    return NextResponse.json({ error: 'A new status is required.' }, { status: 400 });
  }

  await updateOrderStatus(params.orderId, status, extra);
  return NextResponse.json({ ok: true });
}
