import { NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/admin-guard';
import { getVendorById, upsertVendor, deleteVendor } from '@/lib/services/vendors';

const EDITABLE_FIELDS = [
  'businessName', 'contactEmail', 'phone', 'streetAddress', 'city', 'country',
  'locationTag', 'marketId', 'latitude', 'longitude', 'operatingHours', 'status', 'externalStoreUrl',
] as const;

function pickEditableFields(body: Record<string, unknown>) {
  const result: Record<string, unknown> = {};
  for (const field of EDITABLE_FIELDS) {
    if (field in body) result[field] = body[field];
  }
  return result;
}

export async function PATCH(request: Request, { params }: { params: Promise<{ vendorId: string }> }) {
  if (!(await requireAdminSession())) {
    return NextResponse.json({ error: 'Admin sign-in required.' }, { status: 401 });
  }
  const { vendorId } = await params;
  const existing = await getVendorById(vendorId);
  if (!existing) return NextResponse.json({ error: 'Vendor not found.' }, { status: 404 });

  const body = await request.json();
  await upsertVendor(vendorId, pickEditableFields(body));
  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ vendorId: string }> }) {
  if (!(await requireAdminSession())) {
    return NextResponse.json({ error: 'Admin sign-in required.' }, { status: 401 });
  }
  const { vendorId } = await params;
  const existing = await getVendorById(vendorId);
  if (!existing) return NextResponse.json({ error: 'Vendor not found.' }, { status: 404 });

  await deleteVendor(vendorId);
  return NextResponse.json({ ok: true });
}
