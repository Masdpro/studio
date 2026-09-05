/**
 * Populates dev.db with the app's bundled sample data, plus one demo login
 * per role, so there's something to look at and sign in with immediately.
 *
 * Usage: npm run db:seed
 */
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { db } from '../src/db';
import { markets, vendors, products, deliveryAgents, users, orders } from '../src/db/schema';
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
      .values({ ...v, profileManaged: v.profileManaged ?? true })
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
      .values({ ...a, profileManaged: a.profileManaged ?? true })
      .onConflictDoNothing()
      .run();
  }

  // Demo logins use the SAME ids as the sample vendor/agent/order data above
  // (vendor001, agent001, cust001), so signing in as one of these actually
  // shows the seeded products/orders in that account's dashboard —
  // password is "password123" for all three.
  const demoPassword = await bcrypt.hash('password123', 10);
  const demoUsers = [
    { id: 'cust001', email: 'customer@dailybuy.ng', role: 'customer' as const, displayName: 'Demo Customer' },
    { id: 'vendor001', email: 'vendor@dailybuy.ng', role: 'vendor' as const, displayName: 'Demo Vendor (Mama Cass Kitchen)' },
    { id: 'agent001', email: 'agent@dailybuy.ng', role: 'delivery_agent' as const, displayName: 'Demo Delivery Agent (Chinedu Okeke)' },
  ];
  for (const u of demoUsers) {
    db.insert(users)
      .values({ passwordHash: demoPassword, createdAt: new Date(), ...u })
      .onConflictDoNothing()
      .run();
  }

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

  console.log('Seeded markets, vendors, products, delivery agents, sample orders, and 3 demo logins.');
  console.log('Demo logins (password: password123):');
  demoUsers.forEach((u) => console.log(`  ${u.role}: ${u.email}`));
}

main();
