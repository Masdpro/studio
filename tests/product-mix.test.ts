import { describe, expect, it } from 'vitest';
import { hourSeed, mixByVendor } from '@/lib/product-mix';

const make = (vendor: string, n: number) => Array.from({ length: n }, (_, i) => ({ id: `${vendor}${i}`, vendorId: vendor }));

describe('mixing the marketplace by vendor', () => {
  const products = [...make('A', 6), ...make('B', 2), ...make('C', 3)];

  it('keeps every product exactly once', () => {
    const out = mixByVendor(products, 's1');
    expect(out).toHaveLength(products.length);
    expect(new Set(out.map((p) => p.id)).size).toBe(products.length);
  });

  it('deals one product per vendor per round, so no shop fills the top', () => {
    const out = mixByVendor(products, 's1');
    expect(new Set(out.slice(0, 3).map((p) => p.vendorId)).size).toBe(3);
    expect(new Set(out.slice(3, 6).map((p) => p.vendorId)).size).toBe(3);
  });

  it('is steady for the same seed, ignores upload order, and changes with the seed', () => {
    const a = mixByVendor(products, 'x').map((p) => p.id);
    expect(mixByVendor([...products].reverse(), 'x').map((p) => p.vendorId)).toEqual(mixByVendor(products, 'x').map((p) => p.vendorId));
    expect(mixByVendor(products, 'x').map((p) => p.id)).toEqual(a);
    const leaders = new Set(['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'h7', 'h8'].map((s) => mixByVendor(products, s)[0].vendorId));
    expect(leaders.size).toBeGreaterThan(1); // different shops get the first spot over time
  });

  it('changes seed every hour', () => {
    expect(hourSeed(new Date('2026-11-23T14:05:00Z'))).toBe('2026-11-23T14');
    expect(hourSeed(new Date('2026-11-23T14:59:00Z'))).toBe(hourSeed(new Date('2026-11-23T14:00:00Z')));
  });
});
