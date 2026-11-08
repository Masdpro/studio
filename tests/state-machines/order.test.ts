/**
 * Order lifecycle: every allowed move (and the main refused ones) through PATCH /api/orders/[orderId]
 * and the admin cancel route. Written against the behaviour before the state machine refactor.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { PATCH } from '@/app/api/orders/[orderId]/route';
import { POST as adminCancel } from '@/app/api/admin/orders/[orderId]/route';
import { getDeliveryCode } from '@/lib/services/delivery-codes';
import { jsonRequest, makeAgent, makeOrder, makeUser, makeVendor, orderStatus, params, signInAs } from '../helpers';

let customer: string, vendor: string, agent: string;
beforeEach(() => {
  customer = makeUser();
  vendor = makeVendor();
  agent = makeAgent();
});

async function move(orderId: string, as: string, status: string, extra: Record<string, unknown> = {}) {
  signInAs(as);
  const res = await PATCH(jsonRequest('PATCH', { status, ...extra }), params({ orderId }));
  return { status: res.status, body: await res.json() };
}

// [actor, from, to, delivery preference, agent already assigned?]
const ALLOWED: [string, string, string, 'delivery' | 'pickup', boolean][] = [
  ['customer', 'Pending', 'Cancelled', 'delivery', false],
  ['customer', 'Processing', 'Cancelled', 'delivery', false],
  ['customer', 'ReadyForCustomerPickup', 'PickedUpByCustomer', 'pickup', false],
  ['vendor', 'Pending', 'Processing', 'delivery', false],
  ['vendor', 'Pending', 'Cancelled', 'delivery', false],
  ['vendor', 'Processing', 'ReadyForPickup', 'delivery', false],
  ['vendor', 'Processing', 'ReadyForCustomerPickup', 'pickup', false],
  ['vendor', 'Processing', 'Cancelled', 'delivery', false],
  ['agent', 'ReadyForPickup', 'AcceptedByAgent', 'delivery', false],
  ['agent', 'AcceptedByAgent', 'PickedUpByAgent', 'delivery', true],
  ['agent', 'PickedUpByAgent', 'Delivered', 'delivery', true],
  ['agent', 'Out for Delivery', 'Delivered', 'delivery', true],
];

describe('order: allowed transitions', () => {
  it.each(ALLOWED)('%s moves %s → %s', async (actor, from, to, preference, assigned) => {
    const id = makeOrder({ customerId: customer, vendorId: vendor, status: from, preference, agentId: assigned ? agent : null });
    const who = actor === 'customer' ? customer : actor === 'vendor' ? vendor : agent;
    const extra = to === 'Delivered' ? { deliveryCode: getDeliveryCode(id) } : {};
    const r = await move(id, who, to, extra);
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    expect(orderStatus(id)).toBe(to);
  });
});

// [actor, from, to]: moves nobody may make
const REFUSED: [string, string, string][] = [
  ['customer', 'Pending', 'Processing'],
  ['customer', 'ReadyForPickup', 'Cancelled'],
  ['customer', 'PickedUpByAgent', 'Delivered'],
  ['vendor', 'Pending', 'Delivered'],
  ['vendor', 'ReadyForPickup', 'Cancelled'],
  ['vendor', 'Delivered', 'Processing'],
  ['vendor', 'Cancelled', 'Processing'],
  ['agent', 'Pending', 'AcceptedByAgent'],
  ['agent', 'AcceptedByAgent', 'Delivered'],
  ['agent', 'Delivered', 'PickedUpByAgent'],
];

describe('order: refused transitions', () => {
  it.each(REFUSED)('%s cannot move %s → %s', async (actor, from, to) => {
    const id = makeOrder({ customerId: customer, vendorId: vendor, status: from, agentId: actor === 'agent' && from !== 'Pending' ? agent : null });
    const who = actor === 'customer' ? customer : actor === 'vendor' ? vendor : agent;
    const r = await move(id, who, to);
    expect([403, 409]).toContain(r.status);
    expect(orderStatus(id)).toBe(from);
  });
});

describe('order: guards', () => {
  it('ready-for-delivery is refused on a pickup order', async () => {
    const id = makeOrder({ customerId: customer, vendorId: vendor, status: 'Processing', preference: 'pickup' });
    expect((await move(id, vendor, 'ReadyForPickup')).status).toBe(409);
    expect(orderStatus(id)).toBe('Processing');
  });
  it('ready-for-customer-pickup is refused on a delivery order', async () => {
    const id = makeOrder({ customerId: customer, vendorId: vendor, status: 'Processing', preference: 'delivery' });
    expect((await move(id, vendor, 'ReadyForCustomerPickup')).status).toBe(409);
  });
  it('delivered needs the right delivery code', async () => {
    const id = makeOrder({ customerId: customer, vendorId: vendor, status: 'PickedUpByAgent', agentId: agent });
    getDeliveryCode(id);
    const r = await move(id, agent, 'Delivered', { deliveryCode: '0000' === getDeliveryCode(id) ? '1111' : '0000' });
    expect(r.status).toBe(400);
    expect(r.body.code).toBe('DELIVERY_CODE');
    expect(orderStatus(id)).toBe('PickedUpByAgent');
  });
  it('an agent who is not approved cannot claim a delivery', async () => {
    const pendingAgent = makeAgent('pending');
    const id = makeOrder({ customerId: customer, vendorId: vendor, status: 'ReadyForPickup' });
    expect((await move(id, pendingAgent, 'AcceptedByAgent')).status).toBe(403);
    expect(orderStatus(id)).toBe('ReadyForPickup');
  });
  it('claiming sets the delivery agent', async () => {
    const id = makeOrder({ customerId: customer, vendorId: vendor, status: 'ReadyForPickup' });
    await move(id, agent, 'AcceptedByAgent');
    const { getOrderById } = await import('@/lib/services/orders');
    expect((await getOrderById(id))?.deliveryAgentId).toBe(agent);
  });
  it('a stranger cannot move an order', async () => {
    const id = makeOrder({ customerId: customer, vendorId: vendor, status: 'Pending' });
    expect((await move(id, makeUser(), 'Cancelled')).status).toBe(403);
  });
});

describe('order: admin cancel', () => {
  it.each(['Pending', 'Processing', 'ReadyForPickup', 'AcceptedByAgent', 'PickedUpByAgent', 'Delivered'])('admin cancels from %s', async (from) => {
    const admin = makeUser({ role: 'admin' });
    const id = makeOrder({ customerId: customer, vendorId: vendor, status: from, agentId: ['AcceptedByAgent', 'PickedUpByAgent', 'Delivered'].includes(from) ? agent : null });
    signInAs(admin);
    const res = await adminCancel(jsonRequest('POST', { reason: 'Testing a cancel' }), params({ orderId: id }));
    expect(res.status, JSON.stringify(await res.clone().json())).toBe(200);
    expect(orderStatus(id)).toBe('Cancelled');
  });
  it('admin cannot cancel twice', async () => {
    const admin = makeUser({ role: 'admin' });
    const id = makeOrder({ customerId: customer, vendorId: vendor, status: 'Cancelled' });
    signInAs(admin);
    expect((await adminCancel(jsonRequest('POST', { reason: 'Again' }), params({ orderId: id }))).status).toBe(409);
  });
});
