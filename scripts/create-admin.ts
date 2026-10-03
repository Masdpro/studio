// Creates (or promotes) an admin account. Admins are never created through the public sign-up.
// Usage: npm run create-admin -- you@example.com "a-long-password" "Your Name"
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { eq } from 'drizzle-orm';
import { db } from '../src/db';
import { users } from '../src/db/schema';

async function main() {
  const [emailArg, password, displayName] = process.argv.slice(2);
  const email = emailArg?.trim().toLowerCase();
  if (!email || !password || password.length < 10) {
    console.error('Usage: npm run create-admin -- <email> <password of 10+ characters> [display name]');
    process.exit(1);
  }
  const passwordHash = await bcrypt.hash(password, 10);
  const existing = db.select().from(users).where(eq(users.email, email)).get();
  if (existing) {
    db.update(users).set({ role: 'admin', passwordHash, emailVerifiedAt: new Date(), approvalStatus: 'approved' }).where(eq(users.id, existing.id)).run();
    console.log(`Updated ${email} → admin`);
  } else {
    db.insert(users)
      .values({ id: randomUUID(), email, passwordHash, role: 'admin', displayName: displayName ?? 'Admin', createdAt: new Date(), emailVerifiedAt: new Date(), approvalStatus: 'approved' })
      .run();
    console.log(`Created admin ${email}`);
  }
}
main();
