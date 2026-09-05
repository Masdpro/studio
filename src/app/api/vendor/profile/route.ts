import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { upsertVendor } from '@/lib/services/vendors';

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
