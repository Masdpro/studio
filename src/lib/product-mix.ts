/**
 * Orders the marketplace so every vendor gets seen: products are dealt out one vendor at a time
 * (A, B, C, A, B, C, …) instead of in upload order, where one busy shop could fill the first screens.
 * The order of vendors (and of each vendor's products) is shuffled with a seed that changes every
 * hour, so the top spots rotate between shops while the page stays steady for someone browsing.
 */

/** A small seeded random number generator (mulberry32): the same seed always gives the same order. */
function seededRandom(seed: string): () => number {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(items: T[], rand: () => number): T[] {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** The seed for the current hour, e.g. "2026-11-23T14". */
export const hourSeed = (now = new Date()) => now.toISOString().slice(0, 13);

export function mixByVendor<T extends { vendorId: string }>(products: T[], seed = hourSeed()): T[] {
  const rand = seededRandom(seed);
  const byVendor = new Map<string, T[]>();
  for (const p of products) {
    const list = byVendor.get(p.vendorId);
    if (list) list.push(p);
    else byVendor.set(p.vendorId, [p]);
  }
  // Sort the vendor ids first so the result depends only on the seed, not on upload order.
  const vendors = shuffle([...byVendor.keys()].sort(), rand);
  const queues = vendors.map((v) => shuffle(byVendor.get(v)!, rand));
  const out: T[] = [];
  for (let round = 0; out.length < products.length; round++) {
    for (const q of queues) if (round < q.length) out.push(q[round]);
  }
  return out;
}
