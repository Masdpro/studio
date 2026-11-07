import { db } from '@/db';
import { walletTransactions } from '@/db/schema';
import { and, eq, inArray } from 'drizzle-orm';
import type { Order } from '@/lib/types';
import { postEntry } from '@/lib/services/wallets';
import { createNotification } from '@/lib/services/notifications';

/**
 * Closebuy's service fee on each sale, as a percent of the goods (not the delivery fee).
 * Set PLATFORM_FEE_PERCENT (e.g. 5) to switch it on; it is 0 until then.
 */
export function platformFeePercent(): number {
  const n = Number(process.env.PLATFORM_FEE_PERCENT ?? 0);
  return Number.isFinite(n) && n > 0 && n < 100 ? n : 0;
}

const round2 = (n: number) => Math.round(n * 100) / 100;
const naira = (n: number) => `₦${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
const short = (id: string) => id.slice(0, 8).toUpperCase();

/**
 * Pays out a completed order: the vendor gets the goods total (minus the service fee, if any) and
 * the delivery agent gets the delivery fee. Safe to call more than once: each payout happens once.
 * Call it after the order has moved to Delivered or PickedUpByCustomer.
 */
export async function creditOrderEarnings(order: Order): Promise<void> {
  const goods = round2(order.totalAmount - (order.deliveryFee ?? 0));
  const pct = platformFeePercent();
  const fee = round2((goods * pct) / 100);
  const vendorShare = round2(goods - fee);
  const items = order.items.reduce((n, i) => n + i.quantity, 0);

  if (vendorShare > 0) {
    const applied = postEntry({
      id: `sale:${order.id}`,
      userId: order.vendorId,
      type: 'sale',
      amount: vendorShare,
      fee: fee || null,
      orderId: order.id,
      description: `Sale · order #${short(order.id)} (${items} item${items === 1 ? '' : 's'})${fee ? ` · ${naira(fee)} service fee (${pct}%)` : ''}`,
    });
    if (applied) {
      await createNotification({
        userId: order.vendorId,
        message: `${naira(vendorShare)} from order #${short(order.id)} is now in your wallet and ready to withdraw.`,
        category: 'Transaction',
        link: '/wallet',
        iconName: 'Wallet',
      });
    }
  }

  if (order.deliveryPreference === 'delivery' && order.deliveryAgentId && order.deliveryFee > 0) {
    const applied = postEntry({
      id: `delivery:${order.id}`,
      userId: order.deliveryAgentId,
      type: 'delivery_earning',
      amount: order.deliveryFee,
      orderId: order.id,
      description: `Delivery fee · order #${short(order.id)}`,
    });
    if (applied) {
      await createNotification({
        userId: order.deliveryAgentId,
        message: `${naira(order.deliveryFee)} delivery fee for order #${short(order.id)} is now in your wallet.`,
        category: 'Transaction',
        link: '/wallet',
        iconName: 'Wallet',
      });
    }
  }
}

/**
 * Takes back what a vendor / agent earned on an order that support later cancels and refunds.
 * The balance may go below zero if the money was already withdrawn; it is recovered from future earnings.
 */
export async function reverseOrderEarnings(order: Order, reason?: string): Promise<void> {
  const paid = db
    .select()
    .from(walletTransactions)
    .where(and(eq(walletTransactions.orderId, order.id), inArray(walletTransactions.type, ['sale', 'delivery_earning'])))
    .all();
  for (const p of paid) {
    const applied = postEntry({
      id: `reversal:${p.id}`,
      userId: p.userId,
      type: 'earning_reversal',
      amount: -p.amount,
      orderId: order.id,
      description: `Order #${short(order.id)} refunded to the customer${reason ? ` (${reason})` : ''}`,
    });
    if (applied) {
      await createNotification({
        userId: p.userId,
        message: `Order #${short(order.id)} was refunded to the customer, so ${naira(p.amount)} was taken back from your wallet.`,
        category: 'Transaction',
        link: '/wallet',
        iconName: 'XCircle',
      });
    }
  }
}
