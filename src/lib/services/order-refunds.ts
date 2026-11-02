import type { Order } from '@/lib/types';
import { creditWallet } from '@/lib/services/wallets';
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
  await creditWallet(order.customerId, refunded);
  if (GOODS_STILL_AT_SHOP.includes(order.status)) {
    const qty = new Map<string, number>();
    for (const i of order.items) qty.set(i.productId, (qty.get(i.productId) ?? 0) + i.quantity);
    releaseStock(Array.from(qty.entries()).map(([productId, quantity]) => ({ productId, quantity })));
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
