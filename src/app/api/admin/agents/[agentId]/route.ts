import { NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/admin-guard';
import { getDeliveryAgentById, upsertDeliveryAgent, deleteDeliveryAgent } from '@/lib/services/deliveryAgents';

const EDITABLE_FIELDS = [
  'name', 'email', 'phone', 'streetAddress', 'city', 'country', 'vehicleDetails', 'imageUrl',
] as const;

function pickEditableFields(body: Record<string, unknown>) {
  const result: Record<string, unknown> = {};
  for (const field of EDITABLE_FIELDS) {
    if (field in body) result[field] = body[field];
  }
  // An emptied-out image means "no photo"; the column is nullable.
  if (result.imageUrl === '') result.imageUrl = null;
  return result;
}

export async function PATCH(request: Request, { params }: { params: Promise<{ agentId: string }> }) {
  if (!(await requireAdminSession())) {
    return NextResponse.json({ error: 'Admin sign-in required.' }, { status: 401 });
  }
  const { agentId } = await params;
  const existing = await getDeliveryAgentById(agentId);
  if (!existing) return NextResponse.json({ error: 'Agent not found.' }, { status: 404 });

  const body = await request.json();
  await upsertDeliveryAgent(agentId, pickEditableFields(body));
  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ agentId: string }> }) {
  if (!(await requireAdminSession())) {
    return NextResponse.json({ error: 'Admin sign-in required.' }, { status: 401 });
  }
  const { agentId } = await params;
  const existing = await getDeliveryAgentById(agentId);
  if (!existing) return NextResponse.json({ error: 'Agent not found.' }, { status: 404 });

  await deleteDeliveryAgent(agentId);
  return NextResponse.json({ ok: true });
}
