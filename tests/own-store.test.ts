/** Nobody can order from their own business: their store, or the store their branch login belongs to. */
import { describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { db } from '@/db';
import { vendorBranches } from '@/db/schema';
import { createProduct } from '@/lib/services/products';
import { postEntry } from '@/lib/services/wallets';
import { ownBusinessId } from '@/lib/roles';
import { POST as placeOrder } from '@/app/api/orders/route';
import { jsonRequest, makeUser, makeVendor, signInAs } from './helpers';

const fund = (userId: string) => postEntry({ id: `topup:${randomUUID()}`, userId, type: 'funding', amount: 50000, description: 'Test top-up' });
const product = (vendorId: string, name = 'Jollof Rice') => createProduct({ vendorId, name, description: name, price: 2000, imageUrl: '/uploads/x.jpg' } as any);
const order = (...productIds: string[]) =>
  placeOrder(jsonRequest('POST', { items: productIds.map((productId) => ({ productId, quantity: 1 })), deliveryPreference: 'pickup', deliveryAddress: 'Me' }));

function branchLogin(vendorId: string) {
  const login = makeUser();
  db.insert(vendorBranches).values({ id: randomUUID(), vendorId, name: 'Yaba branch', streetAddress: '9 Branch Rd', city: 'Lagos', country: 'Nigeria', accountUserId: login, createdAt: new Date() } as any).run();
  return login;
}

describe('ordering from your own business', () => {
  it('knows which business an account sells for', () => {
    const v = makeVendor();
    expect(ownBusinessId(v)).toBe(v);
    expect(ownBusinessId(branchLogin(v))).toBe(v);
    expect(ownBusinessId(makeUser())).toBeNull();
  });

  it('a vendor cannot order from their own store, even mixed in with another store', async () => {
    const v = makeVendor();
    const other = makeVendor();
    const mine = await product(v);
    const theirs = await product(other, 'Suya');
    fund(v);
    signInAs(v);
    const res = await order(theirs, mine);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toMatchObject({ code: 'OWN_STORE', productId: mine });
    expect(body.error).toMatch(/your own store/);
    // Nothing was charged or created: the other store's item goes through once theirs is removed.
    expect((await order(theirs)).status).toBe(201);
  });

  it('a branch login cannot order from the store it belongs to', async () => {
    const v = makeVendor();
    const login = branchLogin(v);
    const mine = await product(v);
    fund(login);
    signInAs(login);
    expect((await order(mine)).status).toBe(400);
  });

  it('ordinary customers still order as normal', async () => {
    const v = makeVendor();
    const c = makeUser();
    const p = await product(v);
    fund(c);
    signInAs(c);
    expect((await order(p)).status).toBe(201);
  });
});
