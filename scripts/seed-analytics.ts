// Generates ~30 days of believable demo usage events so the admin Events tab
// has something to show. Rows are flagged demo=true so they can be removed:
//   npm run seed-analytics            add demo events
//   npm run seed-analytics -- --clear remove them again
import { randomUUID } from 'crypto';
import { eq } from 'drizzle-orm';
import { db } from '../src/db';
import { analyticsEvents, products } from '../src/db/schema';

if (process.argv.includes('--clear')) {
  db.delete(analyticsEvents).where(eq(analyticsEvents.demo, true)).run();
  console.log('Removed demo analytics events.');
  process.exit(0);
}

const prods = db.select().from(products).all();
if (!prods.length) { console.error('No products in the database — run db:seed first.'); process.exit(1); }

const DAY = 86_400_000;
const terms = ['rice', 'tomatoes', 'ankara', 'phone', 'generator', 'garri', 'shoes', 'palm oil', 'bag', 'fan', 'catfish', 'yam'];
const pages = ['/', '/', '/', '/cart', '/orders', '/market/abc', '/errands'];
const rnd = (n: number) => Math.floor(Math.random() * n);
const pick = <T,>(a: T[]) => a[rnd(a.length)];
const rows: (typeof analyticsEvents.$inferInsert)[] = [];

const add = (type: string, sessionId: string, at: number, extra: Partial<typeof analyticsEvents.$inferInsert> = {}) =>
  rows.push({ id: randomUUID(), type, sessionId, demo: true, createdAt: new Date(at), ...extra });

for (let d = 30; d >= 0; d--) {
  const base = Date.now() - d * DAY;
  const sessions = 25 + rnd(30) + Math.round((30 - d) * 0.8); // gentle growth
  for (let s = 0; s < sessions; s++) {
    const sid = `demo-${d}-${s}`;
    const hour = Math.min(23, Math.max(6, Math.round(13 + (Math.random() + Math.random() + Math.random() - 1.5) * 8)));
    let t = base - (24 - hour) * 3_600_000 + rnd(3_000_000);
    const step = () => (t += 5_000 + rnd(60_000));
    add('page_view', sid, t, { path: '/' });
    for (let i = rnd(3); i > 0; i--) add('page_view', sid, step(), { path: pick(pages) });
    if (Math.random() < 0.35) add('search', sid, step(), { term: pick(terms) });
    if (Math.random() < 0.7) {
      let carted = false;
      for (let i = 1 + rnd(4); i > 0; i--) {
        const p = pick(prods);
        add('product_view', sid, step(), { productId: p.id, vendorId: p.vendorId });
        if (Math.random() < 0.25) { add('add_to_cart', sid, step(), { productId: p.id, vendorId: p.vendorId }); carted = true; }
      }
      if (carted && Math.random() < 0.5) {
        add('page_view', sid, step(), { path: '/cart' });
        add('checkout_start', sid, step());
        if (Math.random() < 0.6) add('order_placed', sid, step());
      }
    }
  }
}
for (let i = 0; i < rows.length; i += 500) db.insert(analyticsEvents).values(rows.slice(i, i + 500)).run();
console.log(`Inserted ${rows.length} demo events. Remove with: npm run seed-analytics -- --clear`);
