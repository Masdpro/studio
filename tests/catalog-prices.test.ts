/**
 * Suggested prices for Quick add: stored per catalog product, refreshed quarterly from Closebuy
 * shops and online prices (the search is faked here), and read by vendors without any lookup.
 */
import { describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { catalogPrices, jobRuns } from '@/db/schema';
import { createProduct } from '@/lib/services/products';
import { ALL_CATALOG_ITEMS } from '@/lib/product-catalog';
import { catalogPriceMap, closebuyPriceFor, nameTokens, parsePriceReply, pricesDue, priceStatus, PRICE_JOB, refreshCatalogPrices, REFRESH_EVERY_MS, type OnlineLookup } from '@/lib/services/catalog-prices';
import { GET as vendorPrices } from '@/app/api/vendor/catalog-prices/route';
import { GET as adminStatus, POST as adminRefresh } from '@/app/api/admin/catalog-prices/route';
import { makeUser, makeVendor, signInAs } from './helpers';

const list = (name: string, price: number, extra: object = {}) =>
  createProduct({ vendorId: makeVendor(), name, description: name, price, imageUrl: '/uploads/x.jpg', ...extra } as any);
const uniqueNames = Array.from(new Set(ALL_CATALOG_ITEMS.map((i) => i.name.trim().toLowerCase())));

describe('reading prices', () => {
  it('matches the same item at Closebuy shops, ignoring paused listings and other sizes', async () => {
    await list('Golden Penny Semovita 2kg', 3000);
    await list('golden penny semovita (2KG)', 3200);
    await list('Golden Penny Semovita 2kg', 9000, { paused: true });
    await list('Golden Penny Semovita 10kg', 14000);
    expect(closebuyPriceFor('Golden Penny Semovita 2kg')).toEqual({ count: 2, median: 3100 });
    expect(nameTokens('The Fresh Agege Bread (Large)')).toEqual(['agege', 'bread', 'large']);
  });

  it('reads the search model\'s reply and drops bad prices', () => {
    expect(parsePriceReply('```json\n[{"i":1,"low":"₦1,800","typical":1520,"high":1200}]\n```', 2)).toEqual([null, 1500]);
    expect(parsePriceReply('[{"i":0,"low":0,"typical":5,"high":9}]', 1)).toEqual([null]);
    expect(parsePriceReply('[{"i":0,"low":100,"typical":500,"high":5000}]', 1)).toEqual([null]);
    expect(parsePriceReply('nothing found', 1)).toEqual([null]);
  });
});

describe('quarterly update', () => {
  it('prices the whole catalog in batches: Closebuy when enough shops sell it, otherwise online, keeping old prices when nothing is found', async () => {
    for (const p of [480, 500, 520]) await list('Coca-Cola 50cl', p);
    db.insert(catalogPrices).values({ nameKey: 'jollof rice', name: 'Jollof Rice', price: 2000, updatedAt: new Date(0) }).onConflictDoNothing().run();
    const calls: string[][] = [];
    const lookup: OnlineLookup = async (names) => {
      calls.push(names);
      return names.map((n) => (n === 'Jollof Rice' ? null : n === 'Coca-Cola 50cl' ? 700 : 1000));
    };
    const now = new Date('2026-01-01T00:00:00Z');
    const res = await refreshCatalogPrices(lookup, now);
    expect(res).toMatchObject({ started: true, total: uniqueNames.length });
    expect(calls.every((c) => c.length <= 10)).toBe(true);
    expect(calls.flat()).toHaveLength(uniqueNames.length);

    const prices = catalogPriceMap();
    expect(prices['coca-cola 50cl']).toBe(500); // three Closebuy shops beat the online price
    expect(prices['jollof rice']).toBe(2000); // not found this time: last price kept
    expect(prices['indomie belle full 120g']).toBe(1000); // online price
    expect(db.select().from(jobRuns).where(eq(jobRuns.name, PRICE_JOB)).get()?.lastRunAt).toEqual(now);

    expect(pricesDue(new Date(now.getTime() + REFRESH_EVERY_MS - 1000))).toBe(false);
    expect(pricesDue(new Date(now.getTime() + REFRESH_EVERY_MS))).toBe(true);
  });

  it('still runs on Closebuy prices alone when the online search fails', async () => {
    await list('Peak Milk Powder 400g Sachet', 2600);
    const failing: OnlineLookup = async () => {
      throw new Error('quota');
    };
    const res = await refreshCatalogPrices(failing, new Date('2026-04-01T00:00:00Z'));
    expect(res.started).toBe(true);
    if (catalogPriceMap()['peak milk powder 400g sachet'] !== undefined) expect(catalogPriceMap()['peak milk powder 400g sachet']).toBeGreaterThan(0);
    expect(db.select().from(jobRuns).where(eq(jobRuns.name, PRICE_JOB)).get()?.note).toMatch(/search batches failed/);
  });
});

describe('API', () => {
  it('vendors read the stored prices; others cannot', async () => {
    signInAs(null);
    expect((await vendorPrices()).status).toBe(401);
    signInAs(makeUser({ role: 'customer' }));
    expect((await vendorPrices()).status).toBe(401);
    signInAs(makeVendor());
    const res = await vendorPrices();
    expect(res.status).toBe(200);
    expect((await res.json()).prices['coca-cola 50cl']).toBe(500);
  });

  it('only admins see the status or start an update', async () => {
    signInAs(makeVendor());
    expect((await adminStatus()).status).toBe(403);
    expect((await adminRefresh()).status).toBe(403);
    signInAs(makeUser({ role: 'admin' }));
    const s = await (await adminStatus()).json();
    expect(s).toMatchObject({ total: priceStatus().total, priced: expect.any(Number) });
    expect(s.priced).toBeGreaterThan(0);
  });
});
