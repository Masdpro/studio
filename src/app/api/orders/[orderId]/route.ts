import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getOrderById, updateOrderStatus } from '@/lib/services/orders';
import { createNotification } from '@/lib/services/notifications';
import type { Order } from '@/lib/types';

const STATUS_MESSAGES: Partial<Record<Order['status'], string>> = {
  Processing: 'Your order is being processed.',
  ReadyForPickup: 'Your order is ready and waiting for a delivery agent.',
  ReadyForCustomerPickup: 'Your order is ready for pickup.',
  AcceptedByAgent: 'A delivery agent has been assigned to your order.',
  PickedUpByAgent: 'Your order is out for delivery.',
  Delivered: 'Your order has been delivered.',
  Cancelled: 'Your order was cancelled.',
};

const IconByStatus: Partial<Record<Order['status'], string>> = {
  Processing: 'Loader',
  ReadyForPickup: 'PackageCheck',
  ReadyForCustomerPickup: 'PackageCheck',
  AcceptedByAgent: 'Bike',
  PickedUpByAgent: 'Truck',
  Delivered: 'CheckCircle',
  Cancelled: 'XCircle',
};

/** Returns a single order. Only its customer, vendor, or assigned delivery agent may view it. */
export async function GET(request: Request, { params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'You must be signed in.' }, { status: 401 });
  }

  const order = await getOrderById(orderId);
  if (!order) {
    return NextResponse.json({ error: 'Order not found.' }, { status: 404 });
  }

  const { id: userId } = session.user;
  const isParticipant = order.customerId === userId || order.vendorId === userId || order.deliveryAgentId === userId;
  if (!isParticipant) {
    return NextResponse.json({ error: 'You do not have access to this order.' }, { status: 403 });
  }

  return NextResponse.json({ order });
}

/** Updates an order's status. Only the customer, vendor, or assigned delivery agent may do so. */
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

  const { id: userId, role } = session.user;
  const isParticipant = order.customerId === userId || order.vendorId === userId || order.deliveryAgentId === userId;
  // An unassigned delivery is claimable by any delivery agent, not just an existing participant.
  const isClaimingUnassignedDelivery =
    role === 'delivery_agent' && !order.deliveryAgentId && order.status === 'ReadyForPickup';
  if (!isParticipant && !isClaimingUnassignedDelivery) {
    return NextResponse.json({ error: 'You do not have access to this order.' }, { status: 403 });
  }

  const body = await request.json();
  const { status } = body as { status: Order['status'] };
  if (!status) {
    return NextResponse.json({ error: 'A new status is required.' }, { status: 400 });
  }

  // The only field besides status any transition ever needs to set is which
  // agent is claiming an unassigned delivery — and that must always be the
  // caller themselves, never a client-supplied id. Every other field on the
  // order (totalAmount, vendorId, customerId, ...) is server-computed and
  // must never be settable from this endpoint.
  const extra = isClaimingUnassignedDelivery ? { deliveryAgentId: userId } : {};

  await updateOrderStatus(orderId, status, extra);

  // Notify the customer when someone else (vendor/agent) moves their order
  // along — not when they triggered the change themselves (e.g. cancelling).
  if (order.customerId !== userId) {
    const message = STATUS_MESSAGES[status];
    if (message) {
      await createNotification({
        userId: order.customerId,
        message,
        category: 'Activity',
        link: '/orders',
        iconName: IconByStatus[status] ?? 'Package',
      });
    }
  }

  return NextResponse.json({ ok: true });
}
