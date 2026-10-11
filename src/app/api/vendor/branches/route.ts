import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getVendorById, getVendors } from '@/lib/services/vendors';
import { getMarkets } from '@/lib/services/markets';
import { createBranch, getBranchesByVendor, getAllBranches } from '@/lib/services/branches';
import { parseBranchInput, geocode } from '@/lib/branch-input';

const MAX_BRANCHES = 50;

async function vendorSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: NextResponse.json({ error: 'You must be signed in.' }, { status: 401 }) };
  if (session.user.role !== 'vendor') return { error: NextResponse.json({ error: 'Only vendor accounts can manage branches.' }, { status: 403 }) };
  return { id: session.user.id };
}

/** The signed-in vendor's branches, plus the lists the form needs (markets, existing area tags). */
export async function GET() {
  const s = await vendorSession();
  if ('error' in s) return s.error;
  const [branches, markets, vendors, all] = await Promise.all([getBranchesByVendor(s.id), getMarkets(), getVendors(), getAllBranches()]);
  const tags = Array.from(new Set([...vendors.map((v) => v.locationTag), ...all.map((b) => b.locationTag)].filter(Boolean))).sort();
  return NextResponse.json({ branches, markets: markets.map((m) => ({ id: m.id, name: m.name })), tags });
}

export async function POST(request: Request) {
  const s = await vendorSession();
  if ('error' in s) return s.error;
  if (!(await getVendorById(s.id))) {
    return NextResponse.json({ error: 'Set up your vendor profile before adding branches.' }, { status: 400 });
  }
  if ((await getBranchesByVendor(s.id)).length >= MAX_BRANCHES) {
    return NextResponse.json({ error: `You can add up to ${MAX_BRANCHES} branches.` }, { status: 400 });
  }
  const parsed = parseBranchInput(await request.json().catch(() => null));
  if ('error' in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const d = parsed.data as Required<Pick<typeof parsed.data, 'name' | 'streetAddress' | 'city' | 'country'>> & typeof parsed.data;
  if (d.latitude === undefined) {
    const g = await geocode(`${d.streetAddress}, ${d.city}, ${d.country}`);
    if (g) Object.assign(d, g);
  }
  const id = await createBranch(s.id, d as any);
  return NextResponse.json({ id }, { status: 201 });
}
