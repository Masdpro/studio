import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { userHasRole } from '@/lib/roles';
import { getVendorAnalytics } from '@/lib/services/vendorAnalytics';

/** The main vendor's analytics across the main store and every branch. */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !userHasRole(session.user.id, 'vendor')) return NextResponse.json({ error: 'Vendor sign-in required.' }, { status: 401 });
  return NextResponse.json(getVendorAnalytics(session.user.id));
}
