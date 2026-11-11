/**
 * Populates dev.db with the app's bundled sample data, plus one demo login
 * per role, so there's something to look at and sign in with immediately.
 *
 * Usage: npm run db:seed
 */
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { db } from '../src/db';
import { sql } from 'drizzle-orm';
import { markets, vendors, products, deliveryAgents, users, orders, verificationDocuments } from '../src/db/schema';
import {
  sampleMarkets,
  sampleVendors,
  sampleProductsForMockOrders,
  sampleDeliveryAgents,
  masterSampleOrders,
} from '../src/lib/mockData';

async function main() {
  for (const m of sampleMarkets) {
    db.insert(markets)
      .values({ ...m, isTrending: m.isTrending ?? false })
      .onConflictDoNothing()
      .run();
  }

  for (const v of sampleVendors) {
    db.insert(vendors)
      .values({ ...v, profileManaged: v.profileManaged ?? true, approvalStatus: 'approved' })
      .onConflictDoNothing()
      .run();
  }

  for (const p of sampleProductsForMockOrders) {
    db.insert(products)
      .values({ ...p, isAwoof: p.isAwoof ?? false })
      .onConflictDoNothing()
      .run();
  }

  for (const a of sampleDeliveryAgents) {
    db.insert(deliveryAgents)
      .values({ ...a, profileManaged: a.profileManaged ?? true, approvalStatus: 'approved' })
      .onConflictDoNothing()
      .run();
  }

  // Demo logins use the SAME ids as the sample vendor/agent/order data above
  // (vendor001, agent001, cust001), so signing in as one of these actually
  // shows the seeded products/orders in that account's dashboard —
  // password is "password123" for all four. The admin account has no
  // matching sample data row — it's purely a login for /admin.
  const demoPassword = await bcrypt.hash('password123', 10);
  const demoUsers = [
    { id: 'cust001', email: 'customer@closebuy.ng', role: 'customer' as const, displayName: 'Demo Customer' },
    { id: 'vendor001', email: 'vendor@closebuy.ng', role: 'vendor' as const, displayName: 'Demo Vendor (Mama Cass Kitchen)' },
    { id: 'agent001', email: 'agent@closebuy.ng', role: 'delivery_agent' as const, displayName: 'Demo Delivery Agent (Chinedu Okeke)' },
    { id: 'admin001', email: 'admin@closebuy.ng', role: 'admin' as const, displayName: 'Demo Admin' },
  ];
  for (const u of demoUsers) {
    db.insert(users)
      .values({ passwordHash: demoPassword, createdAt: new Date(), emailVerifiedAt: new Date(), phoneVerifiedAt: new Date(), approvalStatus: 'approved', ...u })
      .onConflictDoNothing()
      .run();
  }

  // The demo vendor and agent are fully verified so their dashboards open straight away.
  // (Placeholder document rows only; there are no files behind them.)
  const demoDocs = [
    { userId: 'vendor001', kind: 'business_proof' as const },
    { userId: 'vendor001', kind: 'store_photo' as const },
    { userId: 'agent001', kind: 'government_id' as const },
    { userId: 'agent001', kind: 'selfie' as const },
  ];
  for (const d of demoDocs) {
    db.insert(verificationDocuments)
      .values({ id: `demo-${d.userId}-${d.kind}`, ...d, fileName: 'demo-placeholder', contentType: 'image/png', createdAt: new Date() })
      .onConflictDoNothing()
      .run();
  }

  // Give the demo vendor's products some stock (plenty, running low, sold out) so the stock tools have something to show.
  const demoStock = [12, 3, 0];
  db.all<{ id: string }>(sql`SELECT id FROM products WHERE vendor_id = 'vendor001' AND stock IS NULL ORDER BY id`).forEach((row, i) => {
    if (i < demoStock.length) db.run(sql`UPDATE products SET stock = ${demoStock[i]} WHERE id = ${row.id}`);
  });

  // Sample products carry a stock number; give each one a matching stock row so it shows as tracked.
  db.run(sql`INSERT OR IGNORE INTO stock_levels (product_id, location, color, size, quantity)
    SELECT id, COALESCE(branch_id, 'main'), '', '', MAX(stock, 0) FROM products
    WHERE stock IS NOT NULL AND id NOT IN (SELECT product_id FROM stock_levels)`);

  for (const o of masterSampleOrders) {
    db.insert(orders)
      .values({
        id: o.id,
        customerId: o.customerId,
        vendorId: o.vendorId,
        itemsJson: JSON.stringify(o.items),
        totalAmount: o.totalAmount,
        status: o.status,
        pickupAddress: o.pickupAddress,
        deliveryAddress: o.deliveryAddress,
        deliveryFee: o.deliveryFee,
        estimatedDistance: o.estimatedDistance,
        createdAt: o.createdAt,
        deliveryAgentId: o.deliveryAgentId,
        deliveryPreference: o.deliveryPreference,
      })
      .onConflictDoNothing()
      .run();
  }

  console.log(`Seeded markets, vendors, products, delivery agents, sample orders, and ${demoUsers.length} demo logins.`);
  console.log('Demo logins (password: password123):');
  demoUsers.forEach((u) => console.log(`  ${u.role}: ${u.email}`));
}

main();
