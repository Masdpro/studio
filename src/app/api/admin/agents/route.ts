import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { requireAdminSession } from '@/lib/admin-guard';
import { getDeliveryAgents, upsertDeliveryAgent } from '@/lib/services/deliveryAgents';

export async function GET() {
  if (!(await requireAdminSession())) {
    return NextResponse.json({ error: 'Admin sign-in required.' }, { status: 401 });
  }
  const agents = await getDeliveryAgents();
  return NextResponse.json({ agents });
}

/** Creates a delivery agent profile. Not tied to a login — the agent can register separately. */
export async function POST(request: Request) {
  if (!(await requireAdminSession())) {
    return NextResponse.json({ error: 'Admin sign-in required.' }, { status: 401 });
  }

  const data = await request.json();
  if (!data.name || !data.email || !data.phone || !data.streetAddress || !data.city || !data.country) {
    return NextResponse.json({ error: 'Name, email, phone and address are required.' }, { status: 400 });
  }

  const id = randomUUID();
  await upsertDeliveryAgent(id, { ...data, imageUrl: data.imageUrl || null });
  return NextResponse.json({ id }, { status: 201 });
}
