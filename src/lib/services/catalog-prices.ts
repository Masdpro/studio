/**
 * Suggested prices for the Quick add product list.
 *
 * Prices live in the catalog_prices table, one per catalog product, so Quick add just reads them;
 * nothing is looked up while a vendor is adding products. A background job refreshes them once a
 * quarter from two sources:
 *  - what other Closebuy shops charge for the same item, and
 *  - current Nigerian online prices found with Google Search through Gemini (we never scrape
 *    those sites ourselves).
 * When an item can't be priced, its last suggestion is kept.
 */
import { and, eq, sql } from 'drizzle-orm';
import { db } from '@/db';
import { catalogPrices, jobRuns, products } from '@/db/schema';
import { ALL_CATALOG_ITEMS } from '@/lib/product-catalog';
import { BASELINE_PRICES } from '@/lib/catalog-price-baseline';
import { log } from '@/lib/log';

export const PRICE_JOB = 'catalog-prices';
/** Prices are refreshed when the last update is older than this (about a quarter). */
export const REFRESH_EVERY_MS = 91 * 24 * 60 * 60 * 1000;
const MIN_PRICE = 10;
const MAX_PRICE = 10_000_000;
/** With this many Closebuy shops selling an item, their price is the better local guide. */
const CLOSEBUY_ENOUGH = 3;
const BATCH = 10;
let running = false;
/** What went wrong on the last attempt, if the online search failed (shown to admins). */
let lastProblem: string | null = null;

/** Looks up current prices for a batch of names, all of one business type (e.g. 'food'). */
export type OnlineLookup = (names: string[], typeId?: string) => Promise<(number | null)[]>;

/** Where to look for each kind of product. Cooked food: the delivery apps' restaurant menus. */
export const WHERE_TO_LOOK: Record<string, string> = {
  food: 'restaurant menus on Chowdeck and Glovo in Lagos and Abuja (a single portion, without extra protein unless the dish includes it)',
  drinks: 'Shoprite and Spar listings on Chowdeck and Glovo, Jumia, Konga and Supermart.ng; for drinks made to order (zobo, smoothies, chapman, parfait) use menus on Chowdeck and Glovo',
  groceries: 'Shoprite and Spar listings on Chowdeck and Glovo, Jumia, Konga, Supermart.ng and Market Square; for market produce use local market listings on Chowdeck and Jiji',
  fashion: 'Jumia, Konga and Jiji, and official brand stores in Nigeria',
  electronics: 'Jumia, Konga, Slot, Pointek, 3CHub and Jiji (new items unless the name says UK used); for repairs, typical Lagos repair shop prices',
  beauty: 'Jumia, Konga and Nigerian beauty stores; for salon services, typical Lagos salon prices',
  health: 'HealthPlus, MedPlus and Jumia',
  home: 'Jumia, Konga, Slot and Jiji',
  kids: 'Jumia, Konga and Jiji',
  bakery: 'cake shops and bakeries on Chowdeck and Glovo in Lagos and Abuja, and bakers selling on Instagram',
  scents: 'perfume shops on Chowdeck and Glovo, Jumia, Konga and Nigerian perfume stores (Arabian perfumes and oils included)',
  gifts: 'florists and gift shops on Chowdeck and Glovo, Jumia, Konga and Lagos gift and party-supply stores',
  meat: 'frozen food stores, butchers and markets on Chowdeck and Glovo, Shoprite and Spar listings, and Jiji',
};

const STOP = new Set(['the', 'and', 'with', 'for', 'of', 'a', 'an', 'in', 'per', 'pack', 'fresh', 'new', 'original']);
export const nameKey = (name: string) => name.trim().toLowerCase().replace(/\s+/g, ' ');
const TYPE_OF = new Map(ALL_CATALOG_ITEMS.map((i) => [nameKey(i.name), i.typeId]));

/** Lower-cased words that identify an item ("Caprice Rice 50kg" -> caprice, rice, 50kg). */
export function nameTokens(name: string): string[] {
  return Array.from(new Set(name.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter((w) => w.length >= 2 && !STOP.has(w))));
}

const roundPrice = (n: number) => (n >= 1000 ? Math.round(n / 50) * 50 : Math.max(10, Math.round(n / 10) * 10));
const sane = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n) && n >= MIN_PRICE && n <= MAX_PRICE;

/** What Closebuy shops charge for an item with the same name words (paused listings left out). */
export function closebuyPriceFor(name: string): { count: number; median: number } | null {
  const tokens = nameTokens(name);
  if (!tokens.length) return null;
  const longest = [...tokens].sort((a, b) => b.length - a.length)[0];
  const rows = db
    .select({ name: products.name, price: products.price, discountPrice: products.discountPrice })
    .from(products)
    .where(and(eq(products.paused, false), sql`lower(${products.name}) like ${'%' + longest + '%'}`))
    .limit(500)
    .all();
  const prices = rows
    .filter((r) => {
      const have = new Set(nameTokens(r.name));
      return tokens.every((t) => have.has(t));
    })
    .map((r) => (r.discountPrice && r.discountPrice > 0 && r.discountPrice < r.price ? r.discountPrice : r.price))
    .filter(sane)
    .sort((a, b) => a - b);
  if (!prices.length) return null;
  const mid = Math.floor(prices.length / 2);
  return { count: prices.length, median: roundPrice(prices.length % 2 ? prices[mid] : (prices[mid - 1] + prices[mid]) / 2) };
}

/** Reads the typical prices out of the model's reply (it may wrap the JSON in prose or a code fence). */
export function parsePriceReply(text: string, count: number): (number | null)[] {
  const out: (number | null)[] = Array(count).fill(null);
  const start = text.indexOf('[');
  const end = text.lastIndexOf(']');
  if (start < 0 || end <= start) return out;
  let rows: unknown;
  try {
    rows = JSON.parse(text.slice(start, end + 1));
  } catch {
    return out;
  }
  if (!Array.isArray(rows)) return out;
  for (const raw of rows as Record<string, unknown>[]) {
    const i = Number(raw?.i);
    if (!Number.isInteger(i) || i < 0 || i >= count) continue;
    const nums = [raw.low, raw.typical, raw.high].map((v) => (typeof v === 'string' ? Number(v.replace(/[^\d.]/g, '')) : v));
    if (!nums.every(sane)) continue;
    const [low, typical, high] = (nums as number[]).slice().sort((a, b) => a - b);
    // A spread this wide means the results were for different things; don't guess.
    if (high > low * 6) continue;
    out[i] = roundPrice(typical);
  }
  return out;
}

/** One Google-grounded Gemini call for a batch of product names. */
export const geminiLookup: OnlineLookup = async (names, typeId) => {
  const { ai } = await import('@/ai/genkit');
  const list = names.map((n, i) => `${i}. ${n}`).join('\n');
  const where = (typeId && WHERE_TO_LOOK[typeId]) || 'Nigerian online stores and marketplaces such as Jumia, Konga, Jiji and Chowdeck';
  const prompt = `You help small Nigerian shops price their products. Use Google Search to find what each item below sells for in Nigeria right now, in naira. Look at ${where}.

Items:
${list}

Rules:
- Only use prices you actually found in current Nigerian listings for the same item and size. Never estimate or convert from another currency.
- If you can't find a reliable current price for an item, leave it out.
- "typical" is the price most shops charge; "low" and "high" are the cheapest and dearest ordinary listings (ignore bulk/wholesale lots and obviously wrong listings).

Reply with only a JSON array, one object per item you found, like:
[{"i":0,"low":1200,"typical":1500,"high":1800}]`;
  const res = await ai.generate({ prompt, config: { googleSearchRetrieval: true, temperature: 0 } });
  return parsePriceReply(res.text ?? '', names.length);
};

export const onlineLookupAvailable = () => !!(process.env.GOOGLE_GENAI_API_KEY || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY);

/** Every suggested price, keyed by lower-cased product name, for Quick add. */
export function catalogPriceMap(): Record<string, number> {
  const out: Record<string, number> = {};
  for (const r of db.select({ k: catalogPrices.nameKey, p: catalogPrices.price }).from(catalogPrices).all()) out[r.k] = r.p;
  return out;
}

export function lastPriceRun(): Date | null {
  return db.select({ at: jobRuns.lastRunAt }).from(jobRuns).where(eq(jobRuns.name, PRICE_JOB)).get()?.at ?? null;
}

/**
 * Gives every catalog product without a suggested price its starting price (checked on Chowdeck,
 * Glovo or Shoprite listings, or an estimate), and brings older starting prices up to date when
 * the list changes. Prices that came from the online search or Closebuy shops are never touched.
 */
export function ensureBaselinePrices(now = new Date()) {
  let added = 0;
  for (const item of ALL_CATALOG_ITEMS) {
    const base = BASELINE_PRICES[item.name];
    if (!base) continue;
    const res = db
      .insert(catalogPrices)
      .values({ nameKey: nameKey(item.name), name: item.name, price: base[0], source: base[1], updatedAt: now })
      .onConflictDoUpdate({
        target: catalogPrices.nameKey,
        set: { price: base[0], source: base[1], updatedAt: now },
        where: sql`${catalogPrices.source} in ('checked', 'estimate') and (${catalogPrices.price} <> ${base[0]} or ${catalogPrices.source} <> ${base[1]})`,
      })
      .run();
    added += res.changes;
  }
  return added;
}

export function priceStatus() {
  const total = new Set(ALL_CATALOG_ITEMS.map((i) => nameKey(i.name))).size;
  const bySource: Record<string, number> = {};
  for (const r of db.select({ s: catalogPrices.source, n: sql<number>`count(*)` }).from(catalogPrices).groupBy(catalogPrices.source).all()) bySource[r.s] = r.n;
  const priced = Object.values(bySource).reduce((a, b) => a + b, 0);
  const last = lastPriceRun();
  return {
    total,
    priced,
    lastRunAt: last?.toISOString() ?? null,
    nextRunAt: last ? new Date(last.getTime() + REFRESH_EVERY_MS).toISOString() : null,
    running,
    onlineLookup: onlineLookupAvailable(),
    problem: lastProblem,
    bySource,
  };
}

/**
 * Re-prices every catalog product. Online prices are searched in batches of ten; an item without
 * an online or Closebuy price keeps its previous suggestion.
 */
export async function refreshCatalogPrices(lookup: OnlineLookup | null = onlineLookupAvailable() ? geminiLookup : null, now = new Date()) {
  if (running) return { started: false as const };
  running = true;
  try {
    ensureBaselinePrices(now);
    // Grouped by business type, so each search looks in the right places (food on Chowdeck and Glovo).
    const names = Array.from(new Map(ALL_CATALOG_ITEMS.map((i) => [nameKey(i.name), i.name])).values()).sort(
      (a, b) => (TYPE_OF.get(nameKey(a)) ?? '').localeCompare(TYPE_OF.get(nameKey(b)) ?? ''),
    );
    const batches: { start: number; names: string[]; typeId?: string }[] = [];
    for (let i = 0; i < names.length; i++) {
      const t = TYPE_OF.get(nameKey(names[i]));
      const last = batches[batches.length - 1];
      if (last && last.typeId === t && last.names.length < BATCH) last.names.push(names[i]);
      else batches.push({ start: i, names: [names[i]], typeId: t });
    }
    const online: (number | null)[] = names.map(() => null);
    let failedBatches = 0;
    let okBatches = 0;
    let quotaErrors = 0;
    let lastError = '';
    if (lookup) {
      for (const b of batches) {
        try {
          const found = await Promise.race([lookup(b.names, b.typeId), new Promise<never>((_, rej) => setTimeout(() => rej(new Error('timeout')), 60_000))]);
          b.names.forEach((_, j) => (online[b.start + j] = found[j] ?? null));
          okBatches++;
          quotaErrors = 0;
        } catch (err) {
          failedBatches++;
          lastError = (err as Error).message ?? '';
          log.warn('Online price search failed for a batch', { error: lastError.slice(0, 200) });
          // Out of quota: stop instead of sending the rest of the catalog into the same wall.
          if (/429|quota|rate limit/i.test(lastError) && ++quotaErrors >= 2) break;
        }
      }
    }
    const searchFailed = !!lookup && okBatches === 0;
    lastProblem = searchFailed
      ? /429|quota/i.test(lastError)
        ? 'The online price search was refused for quota. Google Search in Gemini needs billing turned on for the API key. Starting prices and Closebuy shop prices are in use; it will try again tomorrow.'
        : 'The online price search failed. Starting prices and Closebuy shop prices are in use; it will try again tomorrow.'
      : null;
    let updated = 0;
    names.forEach((name, i) => {
      const local = closebuyPriceFor(name);
      const useLocal = !!local && (local.count >= CLOSEBUY_ENOUGH || !online[i]);
      const price = useLocal ? local!.median : online[i];
      if (!price) return;
      const source = useLocal ? ('closebuy' as const) : ('online' as const);
      db.insert(catalogPrices)
        .values({ nameKey: nameKey(name), name, price, source, updatedAt: now })
        .onConflictDoUpdate({ target: catalogPrices.nameKey, set: { name, price, source, updatedAt: now } })
        .run();
      updated++;
    });
    const note = `${updated} of ${names.length} priced${lookup ? '' : ' (Closebuy prices only)'}${failedBatches ? `, ${failedBatches} search batches failed` : ''}`;
    // If the online search didn't work at all, don't count this as the quarter's update, so the
    // daily check tries again.
    if (!searchFailed) db.insert(jobRuns).values({ name: PRICE_JOB, lastRunAt: now, note }).onConflictDoUpdate({ target: jobRuns.name, set: { lastRunAt: now, note } }).run();
    if (searchFailed) log.warn('Suggested price update: online search did not work', { area: 'jobs', note, error: lastError.slice(0, 300) });
    else log.info('Suggested prices updated', { note });
    return { started: true as const, updated, total: names.length };
  } finally {
    running = false;
  }
}

export function pricesDue(now = new Date()): boolean {
  const last = lastPriceRun();
  return !last || now.getTime() - last.getTime() >= REFRESH_EVERY_MS;
}

let scheduled = false;
/**
 * Checks once a day whether a quarter has passed since the last update and, if so, refreshes.
 * Started from instrumentation.ts when the server boots (Closebuy runs one server instance).
 */
export function startPriceSchedule() {
  if (scheduled || process.env.NODE_ENV === 'test') return;
  scheduled = true;
  try {
    ensureBaselinePrices();
  } catch (err) {
    log.error('Could not add starting prices', { area: 'jobs', err });
  }
  const check = () => {
    if (!onlineLookupAvailable()) return; // without the search key there is nothing new to learn
    if (pricesDue()) refreshCatalogPrices().catch((err) => log.error('Suggested price update failed', { area: 'jobs', err }));
  };
  setTimeout(check, 5 * 60 * 1000).unref?.();
  setInterval(check, 24 * 60 * 60 * 1000).unref?.();
}

