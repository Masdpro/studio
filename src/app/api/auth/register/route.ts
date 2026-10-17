import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { upsertVendor } from '@/lib/services/vendors';
import { upsertDeliveryAgent } from '@/lib/services/deliveryAgents';
import { normalizeNigerianPhone, sendEmailVerification } from '@/lib/verification';
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
    return NextResponse.json({ error: 'An account with that email already exists' }, { status: 409 });
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
  // In development the link is returned so it can be shown on screen (nothing is really emailed).
  const devLink = exposeDevCodes && 'link' in sent ? sent.link : undefined;
  return NextResponse.json({ id, email, role, devLink }, { status: 201 });
}
