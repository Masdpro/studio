/**
 * Populates dev.db with the app's bundled sample data, plus one demo login
 * per role, so there's something to look at and sign in with immediately.
 *
 * Usage: npm run db:seed
 */
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { db } from '../src/db';
import { markets, vendors, products, deliveryAgents, users } from '../src/db/schema';
import { sampleMarkets, sampleVendors, sampleProductsForMockOrders, sampleDeliveryAgents } from '../src/lib/mockData';

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

  // One demo login per role — password is "password123" for all three.
  const demoPassword = await bcrypt.hash('password123', 10);
  const demoUsers = [
    { email: 'customer@dailybuy.ng', role: 'customer' as const, displayName: 'Demo Customer' },
    { email: 'vendor@dailybuy.ng', role: 'vendor' as const, displayName: 'Demo Vendor' },
    { email: 'agent@dailybuy.ng', role: 'delivery_agent' as const, displayName: 'Demo Delivery Agent' },
  ];
  for (const u of demoUsers) {
    db.insert(users)
      .values({ id: randomUUID(), passwordHash: demoPassword, createdAt: new Date(), ...u })
      .onConflictDoNothing()
      .run();
  }

  console.log('Seeded markets, vendors, products, delivery agents, and 3 demo logins.');
  console.log('Demo logins (password: password123):');
  demoUsers.forEach((u) => console.log(`  ${u.role}: ${u.email}`));
}

main();
