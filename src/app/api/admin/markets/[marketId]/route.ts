import { NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/admin-guard';
import { getMarketById, updateMarket, deleteMarket } from '@/lib/services/markets';

const EDITABLE_FIELDS = ['name', 'description', 'locationTag', 'imageUrl', 'aiHint', 'isTrending'] as const;

function pickEditableFields(body: Record<string, unknown>) {
  const result: Record<string, unknown> = {};
  for (const field of EDITABLE_FIELDS) {
    if (field in body) result[field] = body[field];
  }
  return result;
}

export async function PATCH(request: Request, { params }: { params: Promise<{ marketId: string }> }) {
  if (!(await requireAdminSession())) {
    return NextResponse.json({ error: 'Admin sign-in required.' }, { status: 401 });
  }
  const { marketId } = await params;
  const existing = await getMarketById(marketId);
  if (!existing) return NextResponse.json({ error: 'Market not found.' }, { status: 404 });

  const body = await request.json();
  const fields = pickEditableFields(body);
  // An emptied-out Image URL field means "use the placeholder", not "no image" —
  // imageUrl is a required, always-rendered field on Market.
  if (fields.imageUrl === '') fields.imageUrl = 'https://placehold.co/600x400.png';
  await updateMarket(marketId, fields);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ marketId: string }> }) {
  if (!(await requireAdminSession())) {
    return NextResponse.json({ error: 'Admin sign-in required.' }, { status: 401 });
  }
  const { marketId } = await params;
  const existing = await getMarketById(marketId);
  if (!existing) return NextResponse.json({ error: 'Market not found.' }, { status: 404 });

  await deleteMarket(marketId);
  return NextResponse.json({ ok: true });
}
