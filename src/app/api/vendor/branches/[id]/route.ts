import { userHasRole } from '@/lib/roles';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { updateBranch, deleteBranch, getBranchById } from '@/lib/services/branches';
import { parseBranchInput, geocode } from '@/lib/branch-input';

async function vendorId() {
  const session = await getServerSession(authOptions);
  return session?.user?.id && userHasRole(session.user.id, 'vendor') ? session.user.id : null;
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const vid = await vendorId();
  if (!vid) return NextResponse.json({ error: 'Vendor sign-in required.' }, { status: 401 });
  const { id } = await params;
  const existing = await getBranchById(id);
  if (!existing || existing.vendorId !== vid) return NextResponse.json({ error: 'Branch not found.' }, { status: 404 });

  const parsed = parseBranchInput(await request.json().catch(() => null), true);
  if ('error' in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const d = parsed.data;
  // Address changed without new coordinates → refresh the map pin.
  const addressChanged = d.streetAddress !== undefined || d.city !== undefined || d.country !== undefined;
  if (addressChanged && d.latitude === undefined) {
    const g = await geocode(`${d.streetAddress ?? existing.streetAddress}, ${d.city ?? existing.city}, ${d.country ?? existing.country}`);
    if (g) Object.assign(d, g);
  }
  await updateBranch(id, vid, d);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const vid = await vendorId();
  if (!vid) return NextResponse.json({ error: 'Vendor sign-in required.' }, { status: 401 });
  const { id } = await params;
  if (!(await deleteBranch(id, vid))) return NextResponse.json({ error: 'Branch not found.' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
