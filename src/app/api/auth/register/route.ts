import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { upsertVendor } from '@/lib/services/vendors';
import { upsertDeliveryAgent } from '@/lib/services/deliveryAgents';
import { normalizeNigerianPhone, sendEmailVerification, startTradingRole } from '@/lib/verification';
import { getUserRoles, getBranchForUser } from '@/lib/roles';
import { clearFailedPasswords, isLockedOut, recordFailedPassword } from '@/lib/login-throttle';
import { exposeDevCodes } from '@/lib/notify';

// Public self-registration is deliberately limited to these — 'admin' is
// created from the command line (npm run create-admin), never chosen by
// whoever happens to POST to this endpoint.
type PublicRole = 'customer' | 'vendor' | 'delivery_agent';
const PUBLIC_ROLES: PublicRole[] = ['customer', 'vendor', 'delivery_agent'];
function isPublicRole(role: string): role is PublicRole {
  return (PUBLIC_ROLES as string[]).includes(role);
}

const VENDOR_FIELDS = ['businessName', 'contactEmail', 'phone', 'streetAddress', 'city', 'country', 'externalStoreUrl', 'operatingHours', 'status', 'imageUrl'];
const AGENT_FIELDS = ['name', 'email', 'phone', 'streetAddress', 'city', 'country', 'vehicleDetails'];
const pick = (src: Record<string, unknown>, keys: string[]) =>
  Object.fromEntries(keys.filter((k) => src[k] !== undefined).map((k) => [k, src[k]]));

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  const { password, role, displayName, phone, profile } = body as {
    email?: string;
    password?: string;
    role?: string;
    displayName?: string;
    phone?: string;
    profile?: Record<string, unknown>;
  };
  const email = body.email?.trim().toLowerCase();

  if (!email || !password || !role) {
    return NextResponse.json({ error: 'email, password and role are required' }, { status: 400 });
  }
  if (!isPublicRole(role)) {
    return NextResponse.json({ error: 'Invalid role.' }, { status: 400 });
  }
  if (typeof email !== 'string' || typeof password !== 'string' || typeof role !== 'string') {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }
  if (password.length > 72) {
    return NextResponse.json({ error: 'Password must be 72 characters or fewer' }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
  }

  // Vendors and agents must give a valid Nigerian mobile number (verified later by SMS code).
  const normalizedPhone = phone ? normalizeNigerianPhone(phone) : null;
  if (role !== 'customer' && !normalizedPhone) {
    return NextResponse.json({ error: 'Enter a valid Nigerian mobile number, e.g. 08012345678.' }, { status: 400 });
  }

  const existing = db.select().from(users).where(eq(users.email, email)).get();
  if (existing) {
    // One account per person: an existing customer (or agent / vendor) signing up for another
    // role adds that profile to the same login, after proving it's theirs with its password.
    if (role === 'customer') {
      return NextResponse.json({ error: 'You already have a Closebuy account with this email. Sign in instead.', code: 'ACCOUNT_EXISTS' }, { status: 409 });
    }
    if (isLockedOut(email)) {
      return NextResponse.json({ error: 'Too many wrong passwords. Wait 15 minutes and try again, or reset your password.' }, { status: 429 });
    }
    if (!(await bcrypt.compare(password, existing.passwordHash))) {
      recordFailedPassword(email);
      return NextResponse.json(
        {
          error: 'This email already has a Closebuy account. Enter that account’s password to add your ' + (role === 'vendor' ? 'business' : 'delivery agent profile') + ' to it, or reset your password.',
          code: 'EXISTING_ACCOUNT_PASSWORD',
        },
        { status: 401 },
      );
    }
    clearFailedPasswords(email);
    if (existing.suspendedAt) return NextResponse.json({ error: 'This account is suspended. Contact support.' }, { status: 403 });
    if (existing.role === 'admin' || getBranchForUser(existing.id)) {
      return NextResponse.json({ error: 'This email is used for a staff or branch login. Use a different email for your business.' }, { status: 409 });
    }
    const roles = getUserRoles(existing.id);
    if (roles.includes(role)) {
      return NextResponse.json({ error: `You are already registered as a ${role === 'vendor' ? 'vendor' : 'delivery agent'}. Sign in instead.`, code: 'ACCOUNT_EXISTS' }, { status: 409 });
    }
    if (role === 'vendor' && profile) {
      const v = pick(profile, VENDOR_FIELDS) as Record<string, unknown>;
      if (typeof v.imageUrl !== 'string' || !/^\/api\/uploads\/[0-9a-f-]{36}\.(jpg|png|gif|webp)$/.test(v.imageUrl)) delete v.imageUrl;
      await upsertVendor(existing.id, v as any);
    }
    if (role === 'delivery_agent' && profile) await upsertDeliveryAgent(existing.id, pick(profile, AGENT_FIELDS) as any);
    startTradingRole(existing.id, normalizedPhone, roles.includes('vendor') || roles.includes('delivery_agent'));
    if (!existing.displayName && displayName) db.update(users).set({ displayName }).where(eq(users.id, existing.id)).run();

    let devCode: string | undefined;
    if (!existing.emailVerifiedAt) {
      const sent = await sendEmailVerification(existing.id);
      devCode = exposeDevCodes && 'code' in sent ? sent.code : undefined;
    }
    return NextResponse.json({ id: existing.id, email, role, addedToExisting: true, emailVerified: !!existing.emailVerifiedAt, devCode }, { status: 200 });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const id = randomUUID();

  db.insert(users)
    .values({
      id,
      email,
      passwordHash,
      role,
      displayName,
      phone: normalizedPhone,
      approvalStatus: role === 'customer' ? 'approved' : 'pending',
      createdAt: new Date(),
    })
    .run();

  if (role === 'vendor' && profile) {
    const v = pick(profile, VENDOR_FIELDS) as Record<string, unknown>;
    if (typeof v.imageUrl !== 'string' || !/^\/api\/uploads\/[0-9a-f-]{36}\.(jpg|png|gif|webp)$/.test(v.imageUrl)) delete v.imageUrl;
    await upsertVendor(id, v as any);
  }
  if (role === 'delivery_agent' && profile) await upsertDeliveryAgent(id, pick(profile, AGENT_FIELDS) as any);

  const sent = await sendEmailVerification(id);
  // In development the code is returned so it can be shown on screen (nothing is really emailed).
  const devCode = exposeDevCodes && 'code' in sent ? sent.code : undefined;
  return NextResponse.json({ id, email, role, emailVerified: false, devCode }, { status: 201 });
}
