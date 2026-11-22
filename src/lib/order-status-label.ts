import type { Order } from '@/lib/types';

/** Short, plain status names that fit on a phone. */
export const STATUS_LABEL: Partial<Record<Order['status'], string>> = {
  Pending: 'New',
  Processing: 'Preparing',
  ReadyForPickup: 'Awaiting rider',
  ReadyForCustomerPickup: 'Ready to collect',
  PickedUpByCustomer: 'Collected',
  AcceptedByAgent: 'Rider assigned',
  PickedUpByAgent: 'On the way',
  'Out for Delivery': 'On the way',
  Delivered: 'Delivered',
  Cancelled: 'Cancelled',
};

export const statusLabel = (s: string) => STATUS_LABEL[s as Order['status']] ?? s;
