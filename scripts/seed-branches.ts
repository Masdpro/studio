// Adds demo branches to a vendor so the multi-branch store page and search can be tried.
//   npm run seed-branches            (uses the vendor whose name contains "Techub", else the first vendor)
//   npm run seed-branches -- "Name"  (a vendor whose name contains "Name")
import { randomUUID } from 'crypto';
import { eq, like } from 'drizzle-orm';
import { db } from '../src/db';
import { vendors, vendorBranches } from '../src/db/schema';

const term = process.argv[2] ?? 'techub';
const vendor = db.select().from(vendors).where(like(vendors.businessName, `%${term}%`)).get() ?? db.select().from(vendors).get();
if (!vendor) { console.error('No vendors found — run db:seed first.'); process.exit(1); }

if (db.select().from(vendorBranches).where(eq(vendorBranches.vendorId, vendor.id)).all().length > 0) {
  console.log(`${vendor.businessName} already has branches — nothing to do.`);
  process.exit(0);
}
const rows = [
  { name: 'Wuse 2 branch', streetAddress: '14 Aminu Kano Crescent, Wuse 2', city: 'Abuja', locationTag: 'Abuja', latitude: 9.0765, longitude: 7.4686, phone: '+2348011111111', operatingHours: '9 AM - 6 PM, Mon-Sat' },
  { name: 'Ikeja branch', streetAddress: '21 Allen Avenue', city: 'Lagos', locationTag: 'Lagos', latitude: 6.6018, longitude: 3.3515, phone: '+2348022222222', operatingHours: '8 AM - 7 PM, Mon-Sat' },
  { name: 'GRA branch', streetAddress: '5 Aba Road, GRA', city: 'Port Harcourt', locationTag: 'Port Harcourt', latitude: 4.8156, longitude: 7.0498, phone: '+2348033333333', operatingHours: '9 AM - 5 PM, Mon-Fri' },
];
for (const r of rows) {
  db.insert(vendorBranches).values({ id: randomUUID(), vendorId: vendor.id, country: 'Nigeria', status: 'Open', createdAt: new Date(), ...r }).run();
}
console.log(`Added ${rows.length} demo branches to "${vendor.businessName}".`);
