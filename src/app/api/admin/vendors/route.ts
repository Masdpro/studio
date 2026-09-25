import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { requireAdminSession } from '@/lib/admin-guard';
import { getVendors, upsertVendor } from '@/lib/services/vendors';

export async function GET() {
  if (!(await requireAdminSession())) {
    return NextResponse.json({ error: 'Admin sign-in required.' }, { status: 401 });
  }
  const vendors = await getVendors();
  return NextResponse.json({ vendors });
}

/** Creates a new vendor stall. Not tied to a login — same as most seeded stalls. */
export async function POST(request: Request) {
  if (!(await requireAdminSession())) {
    return NextResponse.json({ error: 'Admin sign-in required.' }, { status: 401 });
  }

  const data = await request.json();
  if (!data.businessName || !data.streetAddress || !data.city || !data.country || !data.contactEmail || !data.phone) {
    return NextResponse.json({ error: 'Business name, address, contact email and phone are required.' }, { status: 400 });
  }

  const id = randomUUID();
  await upsertVendor(id, data);
  return NextResponse.json({ id }, { status: 201 });
}
