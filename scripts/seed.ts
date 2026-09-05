/**
 * Seeds Firestore with the app's bundled sample data so the full-stack
 * app has something to show right after a Firebase project is wired up.
 *
 * Usage:
 *   npx tsx scripts/seed.ts
 *
 * Requires FIREBASE_SERVICE_ACCOUNT_KEY to be set (see .env.example).
 */
import 'dotenv/config';
import { adminDb } from '../src/lib/firebase/admin';
import {
  sampleMarkets,
  sampleVendors,
  sampleProductsForMockOrders,
  sampleDeliveryAgents,
} from '../src/lib/mockData';

async function seedCollection<T extends { id: string }>(collectionName: string, items: T[]) {
  const batch = adminDb.batch();
  for (const item of items) {
    const { id, ...data } = item;
    batch.set(adminDb.collection(collectionName).doc(id), data, { merge: true });
  }
  await batch.commit();
  console.log(`Seeded ${items.length} docs into "${collectionName}"`);
}

async function main() {
  await seedCollection('markets', sampleMarkets);
  await seedCollection('vendors', sampleVendors);
  await seedCollection('products', sampleProductsForMockOrders);
  await seedCollection('deliveryAgents', sampleDeliveryAgents);
  console.log('Done.');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
