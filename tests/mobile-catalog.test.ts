/**
 * The phone app's home screens and shop pages come from GET /api/mobile/catalog: the same lists the
 * website's pages read on the server, without contact emails, and never suspended shops or paused products.
 */
import { describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { products, users } from '@/db/schema';
import { GET } from '@/app/api/mobile/catalog/route';
import { makeVendor } from './helpers';

const get = async (query = '') => GET(new Request(`http://test.local/api/mobile/catalog${query}`));
function addProduct(vendorId: string, opts: { paused?: boolean; branchId?: string } = {}) {
  const id = randomUUID();
  db.insert(products)
    .values({ id, vendorId, name: `Item ${id.slice(0, 4)}`, description: '', price: 1000, imageUrl: '/products/jollof.jpg', paused: opts.paused ?? false, branchId: opts.branchId } as any)
    .run();
  return id;
}

describe('mobile catalog', () => {
  it('lists products, shops and service businesses without contact emails', async () => {
    const shop = makeVendor();
    const live = addProduct(shop);
    const paused = addProduct(shop, { paused: true });
    const res = await get();
    expect(res.status).toBe(200);
    const body = await res.json();
    const ids = body.products.map((p: { id: string }) => p.id);
    expect(ids).toContain(live);
    expect(ids).not.toContain(paused);
    const v = body.vendors.find((x: { id: string }) => x.id === shop);
    expect(v).toBeTruthy();
    expect(v.contactEmail).toBeUndefined();
    expect(Array.isArray(body.providers)).toBe(true);
    expect(Array.isArray(body.markets)).toBe(true);
  });

  it('returns one side only when asked', async () => {
    const shopOnly = await (await get('?side=shop')).json();
    expect(shopOnly.providers).toBeUndefined();
    const bookOnly = await (await get('?side=book')).json();
    expect(bookOnly.products).toBeUndefined();
    expect(Array.isArray(bookOnly.providers)).toBe(true);
  });

  it('returns one shop page, and hides suspended shops', async () => {
    const shop = makeVendor();
    const p = addProduct(shop);
    const page = await (await get(`?vendor=${shop}`)).json();
    expect(page.vendor.id).toBe(shop);
    expect(page.vendor.contactEmail).toBeUndefined();
    expect(page.products.map((x: { id: string }) => x.id)).toContain(p);
    db.update(users).set({ suspendedAt: new Date() }).where(eq(users.id, shop)).run();
    expect((await get(`?vendor=${shop}`)).status).toBe(404);
    expect((await get('?vendor=no-such-shop')).status).toBe(404);
  });
});
