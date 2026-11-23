/**
 * Payment vulnerability tests: tries to cheat the money paths the way an attacker would
 * (tampered prices and fees, bad quantities, double spending, someone else's payment,
 * under-payment, replays, refund twice, withdrawing money that isn't yours).
 * Paystack is mocked; the wallet ledger and order code are the real ones.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { orders } from '@/db/schema';

const paystack = vi.hoisted(() => ({ verify: vi.fn(), init: vi.fn() }));
vi.mock('@/lib/paystack', async (orig) => ({
  ...(await orig<typeof import('@/lib/paystack')>()),
  verifyPaystackTransaction: paystack.verify,
  initializePaystackTransaction: paystack.init,
}));

import { POST as placeOrder } from '@/app/api/orders/route';
import { PATCH as updateOrder } from '@/app/api/orders/[orderId]/route';
import { POST as initPayment } from '@/app/api/payments/wallet/initialize/route';
import { GET as verifyPayment } from '@/app/api/payments/wallet/verify/route';
import { POST as withdraw } from '@/app/api/wallet/withdraw/route';
import { createProduct } from '@/lib/services/products';
import { createPendingWalletFunding, getOrCreateWallet, postEntry } from '@/lib/services/wallets';
import { jsonRequest, makeUser, makeVendor, params, signInAs } from '../helpers';

const fund = (userId: string, amount: number) => postEntry({ id: `topup:${randomUUID()}`, userId, type: 'funding', amount, description: 'Test top-up' });
const balance = async (u: string) => (await getOrCreateWallet(u)).balance;
const product = (vendorId: string, price = 2000) => createProduct({ vendorId, name: `Item ${randomUUID().slice(0, 4)}`, description: 'x', price, imageUrl: '/uploads/x.jpg' } as any);
const order = (body: Record<string, unknown>) => placeOrder(jsonRequest('POST', { deliveryPreference: 'pickup', deliveryAddress: 'Me', ...body }));
const ordersOf = (customerId: string) => db.select().from(orders).where(eq(orders.customerId, customerId)).all();
const verify = (ref: string) => verifyPayment(new Request(`http://test.local/api?reference=${encodeURIComponent(ref)}`));

beforeEach(() => {
  paystack.verify.mockReset();
  paystack.init.mockReset();
  paystack.init.mockResolvedValue({ authorizationUrl: 'https://paystack.test/x', accessCode: 'ac', reference: 'r' });
});

describe('placing an order: the browser cannot set what it pays', () => {
  it('ignores a tampered price, name and vendor in the cart', async () => {
    const v = makeVendor(); const c = makeUser();
    const p = await product(v, 5000);
    fund(c, 10000); signInAs(c);
    const res = await order({ items: [{ productId: p, quantity: 1, price: 1, name: 'Free', vendorId: makeVendor() }] });
    expect(res.status).toBe(201);
    expect(await balance(c)).toBe(5000);
    expect(ordersOf(c)[0].totalAmount).toBe(5000);
  });

  it('ignores a tampered delivery fee and a made-up delivery option', async () => {
    const v = makeVendor(); const c = makeUser();
    const p = await product(v, 2000);
    fund(c, 10000); signInAs(c);
    const res = await order({ items: [{ productId: p, quantity: 1 }], deliveryPreference: 'delivery', deliveryAddress: '1 Road, Lagos', deliveryFee: 0, totalAmount: 1 });
    expect(res.status).toBe(201);
    expect(await balance(c)).toBe(10000 - 2000 - 1000);
    // An unknown option must not become free delivery.
    const odd = await order({ items: [{ productId: p, quantity: 1 }], deliveryPreference: 'teleport', deliveryAddress: '1 Road, Lagos' });
    expect(odd.status).toBe(400);
  });

  it('refuses negative, zero, fractional, huge and non-number quantities', async () => {
    const v = makeVendor(); const c = makeUser();
    const p = await product(v, 2000);
    fund(c, 10000); signInAs(c);
    for (const quantity of [-1, 0, 0.5, 1e9, 'ten', null]) {
      const res = await order({ items: [{ productId: p, quantity }] });
      expect(res.status, `quantity ${quantity}`).toBe(400);
    }
    expect(await balance(c)).toBe(10000);
    expect(ordersOf(c)).toHaveLength(0);
  });

  it('refuses an order the wallet cannot cover, and changes nothing', async () => {
    const v = makeVendor(); const c = makeUser();
    const p = await product(v, 5000);
    fund(c, 4999); signInAs(c);
    const res = await order({ items: [{ productId: p, quantity: 1 }] });
    expect(res.status).toBe(402);
    expect(await balance(c)).toBe(4999);
    expect(ordersOf(c)).toHaveLength(0);
  });

  it('cannot spend the same money twice with orders sent at the same time', async () => {
    const v = makeVendor(); const c = makeUser();
    const p = await product(v, 3000);
    fund(c, 5000); signInAs(c);
    const results = await Promise.all(Array.from({ length: 5 }, () => order({ items: [{ productId: p, quantity: 1 }] })));
    expect(results.filter((r) => r.status === 201)).toHaveLength(1);
    expect(await balance(c)).toBe(2000);
    expect(ordersOf(c)).toHaveLength(1);
  });

  it('needs a signed-in customer', async () => {
    signInAs(null);
    const res = await order({ items: [{ productId: 'x', quantity: 1 }] });
    expect(res.status).toBe(401);
  });
});

describe('paying online (Paystack)', () => {
  it('refuses silly amounts and anonymous callers', async () => {
    signInAs(null);
    expect((await initPayment(jsonRequest('POST', { amount: 1000 }))).status).toBe(401);
    const u = makeUser(); signInAs(u);
    (globalThis as any).__testSession.current.user.email = `${u}@test.local`;
    for (const amount of [-500, 0, 99, 1_000_001, Number.NaN, '1000', null]) {
      expect((await initPayment(jsonRequest('POST', { amount }))).status, `amount ${amount}`).toBe(400);
    }
    expect(paystack.init).not.toHaveBeenCalled();
  });

  it("cannot confirm someone else's payment", async () => {
    const owner = makeUser(); const thief = makeUser();
    const ref = await createPendingWalletFunding(owner, 5000);
    paystack.verify.mockResolvedValue({ status: 'success', amountNaira: 5000 });
    signInAs(thief);
    expect((await verify(ref)).status).toBe(404);
    expect(await balance(thief)).toBe(0);
    expect(await balance(owner)).toBe(0);
  });

  it('does not credit more than was paid (under-payment is refused)', async () => {
    const u = makeUser();
    const ref = await createPendingWalletFunding(u, 50000);
    paystack.verify.mockResolvedValue({ status: 'success', amountNaira: 100 });
    signInAs(u);
    const body = await (await verify(ref)).json();
    expect(body.success).toBe(false);
    expect(await balance(u)).toBe(0);
  });

  it('credits the recorded amount once, however often it is confirmed', async () => {
    const u = makeUser();
    const ref = await createPendingWalletFunding(u, 5000, true);
    paystack.verify.mockResolvedValue({ status: 'success', amountNaira: 999999 }); // over-payment never credits extra
    signInAs(u);
    await Promise.all([verify(ref), verify(ref), verify(ref)]);
    await verify(ref);
    expect(await balance(u)).toBe(5000);
  });

  it('does not credit a payment Paystack reports as failed or unfinished', async () => {
    const u = makeUser(); signInAs(u);
    const a = await createPendingWalletFunding(u, 3000);
    paystack.verify.mockResolvedValueOnce({ status: 'failed', amountNaira: 3000 });
    await verify(a);
    const b = await createPendingWalletFunding(u, 3000);
    paystack.verify.mockResolvedValueOnce({ status: 'pending', amountNaira: 0 });
    await verify(b);
    expect(await balance(u)).toBe(0);
  });

  it('refuses a made-up payment reference', async () => {
    const u = makeUser(); signInAs(u);
    paystack.verify.mockResolvedValue({ status: 'success', amountNaira: 5000 });
    expect((await verify('order_fake-ref')).status).toBe(404);
    expect(await balance(u)).toBe(0);
  });
});

describe('Paystack verify: currency', () => {
  it('never treats a payment in another currency as paid', async () => {
    const real = await vi.importActual<typeof import('@/lib/paystack')>('@/lib/paystack');
    const reply = (currency: string) => new Response(JSON.stringify({ status: true, data: { status: 'success', amount: 500000, currency } }), { status: 200 });
    const spy = vi.spyOn(globalThis, 'fetch');
    spy.mockResolvedValueOnce(reply('USD'));
    expect((await real.verifyPaystackTransaction('r1')).status).toBe('failed');
    spy.mockResolvedValueOnce(reply('NGN'));
    expect(await real.verifyPaystackTransaction('r2')).toEqual({ status: 'success', amountNaira: 5000 });
    spy.mockRestore();
  });
});

describe('refunds', () => {
  it('a cancelled order is refunded once, even if cancelled again', async () => {
    const v = makeVendor(); const c = makeUser();
    const p = await product(v, 4000);
    fund(c, 4000); signInAs(c);
    await order({ items: [{ productId: p, quantity: 1 }] });
    const id = ordersOf(c)[0].id;
    const cancel = () => updateOrder(jsonRequest('PATCH', { status: 'Cancelled', actingAs: 'customer' }), params({ orderId: id }));
    const [a, b] = await Promise.all([cancel(), cancel()]);
    expect([a.status, b.status].filter((s) => s === 200)).toHaveLength(1);
    await cancel();
    expect(await balance(c)).toBe(4000);
  });

  it("a customer cannot cancel (and be refunded for) someone else's order", async () => {
    const v = makeVendor(); const c = makeUser(); const other = makeUser();
    const p = await product(v, 4000);
    fund(c, 4000); signInAs(c);
    await order({ items: [{ productId: p, quantity: 1 }] });
    const id = ordersOf(c)[0].id;
    signInAs(other);
    const res = await updateOrder(jsonRequest('PATCH', { status: 'Cancelled', actingAs: 'customer' }), params({ orderId: id }));
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(await balance(other)).toBe(0);
  });
});

describe('withdrawals', () => {
  it('a shopper cannot cash out money they topped up, and nobody can withdraw a negative or excessive amount', async () => {
    const c = makeUser(); fund(c, 20000); signInAs(c);
    for (const amount of [5000, -5000, 0, Number.NaN, 1e12]) {
      const res = await withdraw(jsonRequest('POST', { amount }));
      expect(res.status, `amount ${amount}`).toBe(400);
    }
    expect(await balance(c)).toBe(20000);
  });
});
