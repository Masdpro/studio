import { describe, expect, it } from 'vitest';
import { GET, PUT } from '@/app/api/cart/route';
import { cleanCartItems, mergeCarts } from '@/lib/cart-sync';
import { jsonRequest, makeUser, signInAs } from './helpers';

const line = (productId: string, quantity = 1, extra: Record<string, unknown> = {}) => ({ productId, name: `P ${productId}`, price: 1000, quantity, ...extra });

describe('saved cart (same on the website and the app)', () => {
  it('needs a signed-in user', async () => {
    signInAs(null);
    expect((await GET()).status).toBe(401);
    expect((await PUT(jsonRequest('PUT', { items: [] }))).status).toBe(401);
  });

  it('saves and returns the cart, and each user only sees their own', async () => {
    const a = makeUser(); const b = makeUser();
    signInAs(a);
    expect((await (await GET()).json()).items).toEqual([]);
    await PUT(jsonRequest('PUT', { items: [line('p1', 2, { color: 'Red' }), line('p2')] }));
    const saved = await (await GET()).json();
    expect(saved.items.map((i: { productId: string; quantity: number }) => [i.productId, i.quantity])).toEqual([['p1', 2], ['p2', 1]]);
    signInAs(b);
    expect((await (await GET()).json()).items).toEqual([]);
  });

  it('drops malformed lines, duplicates and silly quantities', () => {
    const out = cleanCartItems([line('ok', 3), line('ok', 9), { productId: 'x' }, line('neg', -4), line('big', 1e9), line('frac', 2.7), 'junk', null, line('bad', 1, { price: -1 })]);
    expect(out.map((i) => [i.productId, i.quantity])).toEqual([['ok', 3], ['neg', 1], ['big', 999], ['frac', 2]]);
    expect(cleanCartItems('nope')).toEqual([]);
    expect(cleanCartItems(Array.from({ length: 150 }, (_, n) => line(`p${n}`)))).toHaveLength(100);
  });

  it('adds guest picks to the saved cart without doubling quantities', () => {
    const merged = mergeCarts([line('a', 2), line('b', 1, { size: 'M' })] as never, [line('a', 3), line('b', 1, { size: 'L' }), line('c')] as never);
    expect(merged.map((i) => [i.productId, i.size ?? '', i.quantity])).toEqual([['a', '', 3], ['b', 'M', 1], ['b', 'L', 1], ['c', '', 1]]);
  });
});
