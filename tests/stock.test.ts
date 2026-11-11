/**
 * Vendor stock: counts per branch and per colour/size, quick changes, pausing, low-stock alerts,
 * and how checkout and cancellations use the right count.
 */
import { describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import { db } from '@/db';
import { notifications, products, vendorBranches } from '@/db/schema';
import { createProduct, getProductById, getProducts, getProductsByVendor, updateProduct } from '@/lib/services/products';
import { adjustStock, getMovements, getStockRows, markSoldOut, releaseStock, reserveStock, resolveKey, restockList, setStock, StockInputError } from '@/lib/services/stock';
import { postEntry } from '@/lib/services/wallets';
import { POST as placeOrder } from '@/app/api/orders/route';
import { GET as getStock, PATCH as patchStock, PUT as putStock } from '@/app/api/vendor/products/[productId]/stock/route';
import { POST as bulk } from '@/app/api/vendor/products/actions/route';
import { jsonRequest, makeUser, makeVendor, params, signInAs } from './helpers';

const flush = () => new Promise((r) => setTimeout(r, 20));

function makeBranch(vendorId: string, name = 'Yaba branch') {
  const id = randomUUID();
  db.insert(vendorBranches).values({ id, vendorId, name, streetAddress: '9 Branch Rd', city: 'Lagos', country: 'Nigeria', createdAt: new Date() } as any).run();
  return id;
}

async function makeProduct(vendorId: string, extra: Partial<Parameters<typeof createProduct>[0]> = {}) {
  return createProduct({ vendorId, name: 'Ankara gown', description: 'Nice', price: 1000, imageUrl: '/uploads/x.jpg', ...extra } as any);
}

const stockOf = (id: string) => db.select({ s: products.stock }).from(products).where(eq(products.id, id)).get()?.s;
const vendorAlerts = (vendorId: string) => db.select().from(notifications).where(eq(notifications.userId, vendorId)).all().map((n) => n.message);

function fund(userId: string, amount: number) {
  postEntry({ id: `topup:${randomUUID()}`, userId, type: 'funding', amount, description: 'Test top-up' });
}

describe('stock counts', () => {
  it('a product created with a simple quantity gets one count at its shop', async () => {
    const v = makeVendor();
    const id = await makeProduct(v, { stock: 7 });
    expect(getStockRows(id)).toEqual([{ location: 'main', color: '', size: '', quantity: 7 }]);
    expect(stockOf(id)).toBe(7);
  });

  it('counts per branch and per colour/size, keeping the total on the product', async () => {
    const v = makeVendor();
    const b = makeBranch(v);
    const id = await makeProduct(v, { colors: ['Red', 'Blue'], sizes: ['M', 'L'] });
    setStock(id, [
      { location: 'main', color: 'red', size: 'm', quantity: 3 },
      { location: 'main', color: 'Blue', size: 'L', quantity: 0 },
      { location: b, color: 'Red', size: 'M', quantity: 2 },
    ], {});
    expect(stockOf(id)).toBe(5);
    // Names are stored the way the vendor spelled the option.
    expect(getStockRows(id).find((r) => r.location === 'main' && r.color === 'Red')?.size).toBe('M');
    const p = await getProductById(id);
    expect(p?.variantStock).toEqual(expect.arrayContaining([{ color: 'Red', size: 'M', quantity: 5 }, { color: 'Blue', size: 'L', quantity: 0 }]));
  });

  it('rejects options the product does not offer, other vendors\' branches and negative counts', async () => {
    const v = makeVendor();
    const other = makeBranch(makeVendor());
    const id = await makeProduct(v, { colors: ['Red'] });
    expect(() => setStock(id, [{ location: 'main', color: 'Green', quantity: 1 }], {})).toThrow(StockInputError);
    expect(() => setStock(id, [{ location: other, quantity: 1 }], {})).toThrow(/not one of yours/);
    expect(() => setStock(id, [{ location: 'main', quantity: -1 }], {})).toThrow(StockInputError);
  });

  it('stock kept in one place serves every branch; stock split by branch only serves its own branch', () => {
    const shared = [{ location: 'main', color: '', size: '', quantity: 4 }];
    expect(resolveKey(shared, { location: 'branch-1' })).toEqual({ location: 'main', color: '', size: '' });
    const split = [{ location: 'main', color: '', size: '', quantity: 4 }, { location: 'b1', color: '', size: '', quantity: 1 }];
    expect(resolveKey(split, { location: 'b1' })?.location).toBe('b1');
    expect(resolveKey(split, { location: 'b2' })).toBeNull();
  });

  it('the simple quantity field never overwrites stock counted per option', async () => {
    const v = makeVendor();
    const id = await makeProduct(v, { sizes: ['S', 'M'] });
    setStock(id, [{ location: 'main', size: 'S', quantity: 2 }, { location: 'main', size: 'M', quantity: 3 }], {});
    await updateProduct(id, { stock: 99 });
    expect(stockOf(id)).toBe(5);
  });

  it('quick +/- never goes below zero and is recorded in the history', async () => {
    const v = makeVendor();
    const id = await makeProduct(v, { stock: 2 });
    adjustStock(id, {}, -5, { userId: v });
    expect(stockOf(id)).toBe(0);
    adjustStock(id, {}, 3, { userId: v });
    expect(stockOf(id)).toBe(3);
    expect(getMovements(id).map((m) => m.reason)).toEqual(expect.arrayContaining(['adjusted', 'counted']));
  });

  it('"Sold out" zeroes every count, and starts tracking a product that was not tracked', async () => {
    const v = makeVendor();
    const id = await makeProduct(v);
    markSoldOut(id, { userId: v });
    expect(stockOf(id)).toBe(0);
    expect((await getProductById(id))?.stock).toBe(0);
  });
});

describe('orders and cancellations', () => {
  it('takes stock from the exact option, all or nothing, and gives it back', async () => {
    const v = makeVendor();
    const a = await makeProduct(v, { sizes: ['S', 'M'] });
    const b = await makeProduct(v, { stock: 1 });
    setStock(a, [{ location: 'main', size: 'S', quantity: 2 }, { location: 'main', size: 'M', quantity: 0 }], {});

    // M is sold out, so nothing is taken from the other line either.
    expect(reserveStock([{ productId: b, quantity: 1 }, { productId: a, quantity: 1, size: 'M' }])).toMatchObject({ ok: false, productId: a, available: 0 });
    expect(stockOf(b)).toBe(1);

    expect(reserveStock([{ productId: a, quantity: 2, size: 'S' }])).toEqual({ ok: true });
    expect(getStockRows(a).find((r) => r.size === 'S')?.quantity).toBe(0);
    releaseStock([{ productId: a, quantity: 2, size: 'S' }]);
    expect(getStockRows(a).find((r) => r.size === 'S')?.quantity).toBe(2);
  });

  it('checkout refuses a size that is sold out at the chosen branch, and paused products', async () => {
    const v = makeVendor();
    const branch = makeBranch(v);
    const id = await makeProduct(v, { sizes: ['M'] });
    setStock(id, [{ location: 'main', size: 'M', quantity: 5 }, { location: branch, size: 'M', quantity: 0 }], {});
    const c = makeUser();
    fund(c, 50000);
    signInAs(c);
    const order = (extra: object = {}) => placeOrder(jsonRequest('POST', { items: [{ productId: id, quantity: 1, size: 'M' }], deliveryPreference: 'pickup', deliveryAddress: 'Home', ...extra }));

    const atBranch = await order({ branchSelections: { [v]: branch } });
    expect(atBranch.status).toBe(409);
    expect((await atBranch.json()).error).toMatch(/sold out at that branch/);

    const atMain = await order();
    expect(atMain.status).toBe(201);
    expect(getStockRows(id).find((r) => r.location === 'main')?.quantity).toBe(4);

    db.update(products).set({ paused: true }).where(eq(products.id, id)).run();
    expect((await order()).status).toBe(400);
  });
});

describe('alerts and the restock list', () => {
  it('alerts the vendor once when stock falls to the low level, and when it sells out', async () => {
    const v = makeVendor();
    const id = await makeProduct(v, { stock: 6 });
    db.update(products).set({ lowStockAt: 3 }).where(eq(products.id, id)).run();
    reserveStock([{ productId: id, quantity: 2 }]); // 4 left: above the level
    await flush();
    expect(vendorAlerts(v)).toHaveLength(0);
    reserveStock([{ productId: id, quantity: 1 }]); // 3 left: low
    reserveStock([{ productId: id, quantity: 1 }]); // 2 left: still low, no second alert
    await flush();
    expect(vendorAlerts(v).filter((m) => m.startsWith('Running low'))).toHaveLength(1);
    reserveStock([{ productId: id, quantity: 2 }]);
    await flush();
    expect(vendorAlerts(v).some((m) => m.startsWith('Sold out: Ankara gown'))).toBe(true);
  });

  it('says which size ran out when others are still in stock', async () => {
    const v = makeVendor();
    const id = await makeProduct(v, { sizes: ['S', 'M'] });
    setStock(id, [{ location: 'main', size: 'S', quantity: 1 }, { location: 'main', size: 'M', quantity: 9 }], {});
    reserveStock([{ productId: id, quantity: 1, size: 'S' }]);
    await flush();
    expect(vendorAlerts(v)).toContain('Ankara gown (S) is sold out.');
  });

  it('lists low, sold-out and partly sold-out products, but not paused ones', async () => {
    const v = makeVendor();
    const low = await makeProduct(v, { name: 'Low', stock: 2 } as any);
    const fine = await makeProduct(v, { name: 'Fine', stock: 50 } as any);
    const partly = await makeProduct(v, { name: 'Partly', sizes: ['S', 'M'] } as any);
    setStock(partly, [{ location: 'main', size: 'S', quantity: 0 }, { location: 'main', size: 'M', quantity: 20 }], {});
    const paused = await makeProduct(v, { name: 'Paused', stock: 0 } as any);
    db.update(products).set({ paused: true }).where(eq(products.id, paused)).run();
    const names = restockList(v).map((p) => p.name);
    expect(names).toEqual(expect.arrayContaining(['Low', 'Partly']));
    expect(names).not.toContain('Fine');
    expect(names).not.toContain('Paused');
    void fine; void low;
  });
});

describe('vendor stock APIs', () => {
  it('only the owner can read or change stock', async () => {
    const v = makeVendor();
    const id = await makeProduct(v, { stock: 3 });
    signInAs(makeVendor());
    expect((await getStock(jsonRequest('GET'), params({ productId: id }))).status).toBe(403);
    expect((await patchStock(jsonRequest('PATCH', { delta: 1 }), params({ productId: id }))).status).toBe(403);
    expect((await bulk(jsonRequest('POST', { ids: [id], action: 'pause' }))).status).toBe(403);
    expect(stockOf(id)).toBe(3);
  });

  it('owner can set counts and alert level, adjust, pause and resume', async () => {
    const v = makeVendor();
    const id = await makeProduct(v, { colors: ['Red'] });
    signInAs(v);
    const put = await putStock(jsonRequest('PUT', { rows: [{ location: 'main', color: 'Red', quantity: 4 }], lowStockAt: 2 }), params({ productId: id }));
    expect(put.status).toBe(200);
    expect((await put.json()).stock).toBe(4);
    expect((await patchStock(jsonRequest('PATCH', { delta: -1, location: 'main', color: 'Red' }), params({ productId: id }))).status).toBe(200);
    expect(stockOf(id)).toBe(3);

    expect((await bulk(jsonRequest('POST', { ids: [id], action: 'pause' }))).status).toBe(200);
    expect((await getProducts()).some((p) => p.id === id)).toBe(false);
    expect((await getProductsByVendor(v)).some((p) => p.id === id)).toBe(false);
    await bulk(jsonRequest('POST', { ids: [id], action: 'resume' }));
    expect((await getProducts()).some((p) => p.id === id)).toBe(true);

    const hist = await (await getStock(jsonRequest('GET'), params({ productId: id }))).json();
    expect(hist.history.length).toBeGreaterThan(0);
    expect(db.select().from(products).where(and(eq(products.id, id))).get()?.lowStockAt).toBe(2);
  });

  it('a bad count is refused with a clear message', async () => {
    const v = makeVendor();
    const id = await makeProduct(v);
    signInAs(v);
    const res = await putStock(jsonRequest('PUT', { rows: [{ location: 'main', quantity: 'lots' }] }), params({ productId: id }));
    expect(res.status).toBe(400);
  });
});
