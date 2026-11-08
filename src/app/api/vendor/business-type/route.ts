import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { eq } from 'drizzle-orm';
import { authOptions } from '@/lib/auth';
import { db } from '@/db';
import { vendors } from '@/db/schema';
import { userHasRole } from '@/lib/roles';
import { getBusinessType } from '@/lib/product-catalog';

/** The signed-in vendor's business type (used to pre-select Quick add). */
export async function GET() {
  const session = await getServerSession(authOptions);
  const id = session?.user?.id;
  if (!id || !userHasRole(id, 'vendor')) return NextResponse.json({ error: 'Vendor sign-in required.' }, { status: 401 });
  const row = db.select({ businessType: vendors.businessType }).from(vendors).where(eq(vendors.id, id)).get();
  return NextResponse.json({ businessType: row?.businessType ?? null });
}

/** PUT { businessType } */
export async function PUT(request: Request) {
  const session = await getServerSession(authOptions);
  const id = session?.user?.id;
  if (!id || !userHasRole(id, 'vendor')) return NextResponse.json({ error: 'Vendor sign-in required.' }, { status: 401 });
  const { businessType } = (await request.json().catch(() => ({}))) as { businessType?: string };
  if (!getBusinessType(businessType)) return NextResponse.json({ error: 'Choose a business type.' }, { status: 400 });
  db.update(vendors).set({ businessType }).where(eq(vendors.id, id)).run();
  return NextResponse.json({ ok: true });
}
