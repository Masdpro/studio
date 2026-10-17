import { getUserRoles } from '@/lib/roles';
import { startTradingRole, normalizeNigerianPhone } from '@/lib/verification';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { upsertVendor, getVendorById, vendorSlugTaken } from '@/lib/services/vendors';
import { slugify } from '@/lib/slug';

/** Returns the signed-in vendor's own profile (or null if not yet created). */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'You must be signed in.' }, { status: 401 });
  }
  const vendor = await getVendorById(session.user.id);
  return NextResponse.json({ vendor: vendor ?? null });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'You must be signed in.' }, { status: 401 });
  }
  if (session.user.role === 'admin') {
    return NextResponse.json({ error: 'Admin accounts cannot have a vendor profile.' }, { status: 403 });
  }

  const data = await request.json();
  const before = getUserRoles(session.user.id);
  const isNew = !before.includes('vendor');
  if (isNew && !normalizeNigerianPhone(String(data?.phone ?? ''))) {
    return NextResponse.json({ error: 'Enter a valid Nigerian mobile number, e.g. 08012345678.' }, { status: 400 });
  }
  const FIELDS = ['businessName', 'contactEmail', 'phone', 'streetAddress', 'city', 'country', 'externalStoreUrl', 'operatingHours', 'status', 'locationTag', 'marketId', 'latitude', 'longitude', 'slug', 'imageUrl'];
  const profile = Object.fromEntries(FIELDS.filter((k) => data?.[k] !== undefined).map((k) => [k, data[k]]));
  if (profile.slug !== undefined) {
    const s = slugify(String(profile.slug));
    if (s.length < 3) return NextResponse.json({ error: 'Link name must have at least 3 letters or numbers.' }, { status: 400 });
    if (vendorSlugTaken(s, session.user.id)) return NextResponse.json({ error: 'That link name is already taken. Try another.' }, { status: 409 });
    profile.slug = s;
  }
  if (profile.imageUrl !== undefined) {
    const img = String(profile.imageUrl ?? '');
    if (img && !/^\/api\/uploads\/[0-9a-f-]{36}\.(jpg|png|gif|webp)$/.test(img)) return NextResponse.json({ error: 'Upload the storefront photo from this page.' }, { status: 400 });
    profile.imageUrl = img || null;
  }
  await upsertVendor(session.user.id, profile as any);
  if (isNew) startTradingRole(session.user.id, data.phone, before.includes('delivery_agent'));

  return NextResponse.json({ ok: true });
}
