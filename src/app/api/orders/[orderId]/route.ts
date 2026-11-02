import { userHasRole, getBranchForUser } from '@/lib/roles';
import { NextResponse } from 'next/server';
import { tradingBlockReason } from '@/lib/verification';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getOrderById, transitionOrderStatus } from '@/lib/services/orders';
import { refundCancelledOrder } from '@/lib/services/order-refunds';
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
  const isParticipant = order.customerId === userId || order.vendorId === userId || order.deliveryAgentId === userId ||
    (!!getBranchForUser(userId) && order.branchId === getBranchForUser(userId)!.id);
  if (!isParticipant) {
    return NextResponse.json({ error: 'You do not have access to this order.' }, { status: 403 });
  }

  return NextResponse.json({ order });
}

type Actor = 'customer' | 'vendor' | 'agent';

/**
 * Who may move an order from which status to which. Anything not listed is
 * refused, so nobody can skip steps (e.g. a customer marking their own order
 * "Delivered") or reopen a finished order.
 */
const ALLOWED: Record<Actor, Partial<Record<Order['status'], Order['status'][]>>> = {
  customer: {
    Pending: ['Cancelled'],
    Processing: ['Cancelled'],
    ReadyForCustomerPickup: ['PickedUpByCustomer'],
  },
  vendor: {
    Pending: ['Processing', 'Cancelled'],
    Processing: ['ReadyForPickup', 'ReadyForCustomerPickup', 'Cancelled'],
  },
  agent: {
    ReadyForPickup: ['AcceptedByAgent'],
    AcceptedByAgent: ['PickedUpByAgent'],
    PickedUpByAgent: ['Delivered'],
    'Out for Delivery': ['Delivered'],
  },
};

/** Updates an order's status, following the rules above. Cancelling refunds the customer and restocks the items. */
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

  const body = await request.json().catch(() => ({}));
  const { status, actingAs } = body as { status?: Order['status']; actingAs?: Actor };
  if (!status) {
    return NextResponse.json({ error: 'A new status is required.' }, { status: 400 });
  }

  const userId = session.user.id;
  const branch = getBranchForUser(userId);
  const isVendorSide = order.vendorId === userId || (!!branch && branch.vendorId === order.vendorId && order.branchId === branch.id);
  const isAssignedAgent = !!order.deliveryAgentId && order.deliveryAgentId === userId;
  // An unassigned delivery is claimable by any delivery agent.
  const isClaimingUnassignedDelivery =
    status === 'AcceptedByAgent' && userHasRole(userId, 'delivery_agent') && !order.deliveryAgentId && order.status === 'ReadyForPickup';

  const actors: Actor[] = [];
  if (order.customerId === userId) actors.push('customer');
  if (isVendorSide) actors.push('vendor');
  if (isAssignedAgent || isClaimingUnassignedDelivery) actors.push('agent');
  if (actors.length === 0) {
    return NextResponse.json({ error: 'You do not have access to this order.' }, { status: 403 });
  }

  // Someone can be both buyer and seller of an order (e.g. testing their own shop): the screen says which role it's acting in.
  const preferred = actingAs && actors.includes(actingAs) ? [actingAs, ...actors.filter((a) => a !== actingAs)] : actors;
  const actor = preferred.find((a) => ALLOWED[a][order.status]?.includes(status));
  if (!actor) {
    return NextResponse.json({ error: `This order can't be moved from "${order.status}" to "${status}".` }, { status: 409 });
  }
  // The "ready" step must match how the customer chose to receive the order.
  if (status === 'ReadyForPickup' && order.deliveryPreference !== 'delivery') {
    return NextResponse.json({ error: 'This order is for customer pickup, not delivery.' }, { status: 409 });
  }
  if (status === 'ReadyForCustomerPickup' && order.deliveryPreference !== 'pickup') {
    return NextResponse.json({ error: 'This order is for delivery, not customer pickup.' }, { status: 409 });
  }
  if (isClaimingUnassignedDelivery) {
    const blocked = tradingBlockReason(userId);
    if (blocked) return NextResponse.json({ error: blocked }, { status: 403 });
  }

  // Only the agent id of the caller themselves is ever written besides status.
  const extra = isClaimingUnassignedDelivery ? { deliveryAgentId: userId } : {};
  if (!transitionOrderStatus(orderId, order.status, status, extra)) {
    return NextResponse.json({ error: 'This order was just updated by someone else. Please refresh.' }, { status: 409 });
  }

  let refunded = 0;
  if (status === 'Cancelled') {
    // Give the money back, put the items back in stock and tell both sides.
    refunded = await refundCancelledOrder(order, actor === 'customer' ? 'customer' : 'vendor');
  } else if (actor !== 'customer') {
    // Tell the customer when the vendor or agent moves their order along.
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
  if (actor === 'customer' && status === 'PickedUpByCustomer') {
    await createNotification({
      userId: order.vendorId,
      message: 'A customer confirmed they collected their order.',
      category: 'Activity',
      link: '/vendor/orders',
      iconName: 'CheckCircle',
    });
  }

  return NextResponse.json({ ok: true, refunded });
}
