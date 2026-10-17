import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getBranchForUser } from '@/lib/roles';
import { getVendorAnalytics } from '@/lib/services/vendorAnalytics';

/** A branch account's analytics: its own orders only. */
export async function GET() {
  const session = await getServerSession(authOptions);
  const branch = session?.user?.id ? getBranchForUser(session.user.id) : null;
  if (!branch) return NextResponse.json({ error: 'Branch sign-in required.' }, { status: 401 });
  return NextResponse.json(getVendorAnalytics(branch.vendorId, branch.id));
}
