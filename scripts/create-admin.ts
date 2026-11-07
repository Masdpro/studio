// Creates (or promotes) an admin account. Admins are never created through the public sign-up.
// Usage: npm run create-admin -- you@example.com "a-long-password" "Your Name" [--super]
// --super makes this the super admin: the one account that can add and remove other admins
// from Admin → Users. Only one super admin exists; passing --super moves the role to this account.
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { eq } from 'drizzle-orm';
import { db } from '../src/db';
import { users } from '../src/db/schema';

async function main() {
  const args = process.argv.slice(2);
  const makeSuper = args.includes('--super');
  const [emailArg, password, displayName] = args.filter((a) => a !== '--super');
  const email = emailArg?.trim().toLowerCase();
  if (!email || !password || password.length < 10) {
    console.error('Usage: npm run create-admin -- <email> <password of 10+ characters> [display name]');
    process.exit(1);
  }
  const passwordHash = await bcrypt.hash(password, 10);
  if (makeSuper) db.update(users).set({ isSuperAdmin: false }).where(eq(users.isSuperAdmin, true)).run();
  const existing = db.select().from(users).where(eq(users.email, email)).get();
  if (existing) {
    db.update(users).set({ role: 'admin', passwordHash, emailVerifiedAt: new Date(), approvalStatus: 'approved', ...(makeSuper ? { isSuperAdmin: true } : {}) }).where(eq(users.id, existing.id)).run();
    console.log(`Updated ${email} → ${makeSuper ? 'super admin' : 'admin'}`);
  } else {
    db.insert(users)
      .values({ id: randomUUID(), email, passwordHash, role: 'admin', displayName: displayName ?? 'Admin', createdAt: new Date(), emailVerifiedAt: new Date(), approvalStatus: 'approved', isSuperAdmin: makeSuper })
      .run();
    console.log(`Created ${makeSuper ? 'super admin' : 'admin'} ${email}`);
  }
}
main();
