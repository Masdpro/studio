import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { upsertVendor, getVendorById } from '@/lib/services/vendors';

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
  if (session.user.role !== 'vendor') {
    return NextResponse.json({ error: 'Only vendor accounts can create a vendor profile.' }, { status: 403 });
  }

  const data = await request.json();
  await upsertVendor(session.user.id, data);

  return NextResponse.json({ ok: true });
}
