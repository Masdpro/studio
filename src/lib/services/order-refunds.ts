import type { Order } from '@/lib/types';
import { postEntry } from '@/lib/services/wallets';
import { reverseOrderEarnings } from '@/lib/services/earnings';
import { releaseStock } from '@/lib/services/products';
import { createNotification } from '@/lib/services/notifications';

// Once the goods have left the shop they aren't back on the shelf, so stock is only returned before this point.
const GOODS_STILL_AT_SHOP: Order['status'][] = ['Pending', 'Processing', 'ReadyForPickup', 'ReadyForCustomerPickup', 'AcceptedByAgent'];

/**
 * Money and stock side of cancelling an order. Call it only after the order's
 * status has been switched to Cancelled (atomically), so it runs exactly once.
 */
export async function refundCancelledOrder(order: Order, by: 'customer' | 'vendor' | 'admin', reason?: string): Promise<number> {
  const refunded = order.totalAmount;
  postEntry({
    id: `refund:${order.id}`,
    userId: order.customerId,
    type: 'refund',
    amount: refunded,
    orderId: order.id,
    description: `Refund · order #${order.id.slice(0, 8).toUpperCase()} cancelled`,
  });
  // If the vendor / agent had already been paid for it (support cancelling a finished order), take that back.
  if (order.status === 'Delivered' || order.status === 'PickedUpByCustomer') await reverseOrderEarnings(order, reason);
  if (GOODS_STILL_AT_SHOP.includes(order.status)) {
    // Back to the exact colour/size at the branch it was collected from.
    releaseStock(order.items.map((i) => ({ productId: i.productId, quantity: i.quantity, location: order.branchId ?? 'main', color: i.color, size: i.size, orderId: order.id })));
  }

  const who = by === 'customer' ? 'You cancelled your order' : by === 'vendor' ? 'The vendor cancelled your order' : 'Closebuy support cancelled your order';
  await createNotification({
    userId: order.customerId,
    message: `${who}${reason ? ` (${reason})` : ''}. ₦${refunded.toLocaleString()} has been refunded to your wallet.`,
    category: 'Transaction',
    link: '/orders',
    iconName: 'XCircle',
  });
  if (by !== 'vendor') {
    await createNotification({
      userId: order.vendorId,
      message: by === 'customer'
        ? `A customer cancelled their ₦${order.totalAmount.toLocaleString()} order.`
        : `Closebuy support cancelled a ₦${order.totalAmount.toLocaleString()} order and refunded the customer${reason ? ` (${reason})` : ''}.`,
      category: 'Activity',
      link: '/vendor/orders',
      iconName: 'XCircle',
    });
  }
  return refunded;
}
