import { defineMachine } from './machine';

export type OrderStatus =
  | 'Pending'
  | 'Processing'
  | 'ReadyForPickup'
  | 'ReadyForCustomerPickup'
  | 'PickedUpByCustomer'
  | 'AcceptedByAgent'
  | 'PickedUpByAgent'
  | 'Out for Delivery'
  | 'Delivered'
  | 'Cancelled';

/** Who is making the move. One person can be several of these on the same order (e.g. buying from their own shop). */
export type OrderActor = 'customer' | 'vendor' | 'agent' | 'admin';

/** What the guards need to know about the order. */
export type OrderContext = { deliveryPreference: 'delivery' | 'pickup' };

const forDelivery = { name: 'order is for delivery', check: (o: OrderContext) => (o.deliveryPreference === 'delivery' ? null : 'This order is for customer pickup, not delivery.') };
const forPickup = { name: 'order is for customer pickup', check: (o: OrderContext) => (o.deliveryPreference === 'pickup' ? null : 'This order is for delivery, not customer pickup.') };

const ALL_BUT_CANCELLED: OrderStatus[] = ['Pending', 'Processing', 'ReadyForPickup', 'ReadyForCustomerPickup', 'PickedUpByCustomer', 'AcceptedByAgent', 'PickedUpByAgent', 'Out for Delivery', 'Delivered'];

export const orderMachine = defineMachine<OrderStatus, OrderActor, OrderContext>({
  name: 'Order',
  description: 'A customer order from one vendor, from checkout to delivery or collection.',
  storedIn: 'orders.status',
  initial: 'Pending',
  states: {
    Pending: { meaning: 'Paid from the wallet; waiting for the vendor to accept.' },
    Processing: { meaning: 'The vendor is preparing it.' },
    ReadyForPickup: { meaning: 'Packed and waiting for a delivery agent to claim it.' },
    ReadyForCustomerPickup: { meaning: 'Packed and waiting for the customer to collect it.' },
    PickedUpByCustomer: { meaning: 'The customer collected it. Vendor is paid.' },
    AcceptedByAgent: { meaning: 'A delivery agent claimed it and is heading to the vendor.' },
    PickedUpByAgent: { meaning: 'On its way to the customer. The customer has their delivery code.' },
    'Out for Delivery': { meaning: 'Old name for PickedUpByAgent.', legacy: true },
    Delivered: { meaning: 'Handed over with the right delivery code. Vendor and agent are paid.' },
    Cancelled: { meaning: 'Cancelled and refunded in full; items back in stock.', final: true },
  },
  transitions: [
    { from: 'Pending', to: 'Processing', event: 'vendor accepts the order', by: ['vendor'] },
    { from: ['Pending', 'Processing'], to: 'Cancelled', event: 'customer cancels or vendor declines', by: ['customer', 'vendor'] },
    { from: 'Processing', to: 'ReadyForPickup', event: 'vendor marks it ready for delivery', by: ['vendor'], guards: [forDelivery] },
    { from: 'Processing', to: 'ReadyForCustomerPickup', event: 'vendor marks it ready for collection', by: ['vendor'], guards: [forPickup] },
    { from: 'ReadyForCustomerPickup', to: 'PickedUpByCustomer', event: 'customer confirms collection', by: ['customer'] },
    { from: 'ReadyForPickup', to: 'AcceptedByAgent', event: 'a delivery agent claims it', by: ['agent'], checkedElsewhere: ['agent is verified and approved', 'no agent assigned yet'] },
    { from: 'AcceptedByAgent', to: 'PickedUpByAgent', event: 'agent collects it from the vendor', by: ['agent'] },
    { from: ['PickedUpByAgent', 'Out for Delivery'], to: 'Delivered', event: 'agent enters the customer\'s delivery code', by: ['agent'], checkedElsewhere: ['correct delivery code (5 tries)'] },
    { from: ALL_BUT_CANCELLED, to: 'Cancelled', event: 'support cancels with a reason (refunds in full)', by: ['admin'] },
  ],
});

/** Statuses after which the vendor (and agent) have been paid. */
export const ORDER_COMPLETED: readonly OrderStatus[] = ['Delivered', 'PickedUpByCustomer'];

/** Orders still in progress (not completed or cancelled). */
export const ORDER_OPEN: readonly OrderStatus[] = orderMachine.stateNames.filter((s) => !orderMachine.isFinal(s) && !ORDER_COMPLETED.includes(s));
