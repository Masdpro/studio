// One-off: accounts created before verification existed are treated as already verified (email and phone),
// so nobody is locked out after `npm run db:push`. Safe to run more than once.
import 'dotenv/config';
import { isNull } from 'drizzle-orm';
import { db } from '../src/db';
import { users } from '../src/db/schema';

const result = db.update(users).set({ emailVerifiedAt: new Date(), phoneVerifiedAt: new Date(), approvalStatus: 'approved' }).where(isNull(users.emailVerifiedAt)).run();
console.log(`Marked ${result.changes} existing account(s) as verified.`);
