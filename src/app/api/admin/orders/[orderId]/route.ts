import { NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/admin-guard';
import { getOrderById, transitionOrderStatus } from '@/lib/services/orders';
import { refundCancelledOrder } from '@/lib/services/order-refunds';

/**
 * POST { reason } — support cancels an order and refunds the customer in full,
 * at any stage (e.g. a dispute after delivery). Already-cancelled orders are refused.
 */
export async function POST(request: Request, { params }: { params: Promise<{ orderId: string }> }) {
  if (!(await requireAdminSession())) return NextResponse.json({ error: 'Admin sign-in required.' }, { status: 401 });
  const { orderId } = await params;
  const order = await getOrderById(orderId);
  if (!order) return NextResponse.json({ error: 'Order not found.' }, { status: 404 });
  if (order.status === 'Cancelled') return NextResponse.json({ error: 'This order is already cancelled and refunded.' }, { status: 409 });

  const { reason } = (await request.json().catch(() => ({}))) as { reason?: string };
  const note = typeof reason === 'string' ? reason.trim().slice(0, 140) : '';
  if (note.length < 3) return NextResponse.json({ error: 'Give a short reason the customer and vendor will see.' }, { status: 400 });

  if (!transitionOrderStatus(orderId, order.status, 'Cancelled')) {
    return NextResponse.json({ error: 'This order was just updated by someone else. Please refresh.' }, { status: 409 });
  }
  const refunded = await refundCancelledOrder(order, 'admin', note);
  return NextResponse.json({ ok: true, refunded });
}
