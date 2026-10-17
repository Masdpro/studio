import { getUserRoles } from '@/lib/roles';
import { startTradingRole, normalizeNigerianPhone } from '@/lib/verification';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { upsertDeliveryAgent, getDeliveryAgentById } from '@/lib/services/deliveryAgents';

/** Returns the signed-in delivery agent's own profile (or null if not yet created). */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'You must be signed in.' }, { status: 401 });
  }
  const agent = await getDeliveryAgentById(session.user.id);
  return NextResponse.json({ agent: agent ?? null });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'You must be signed in.' }, { status: 401 });
  }
  if (session.user.role === 'admin') {
    return NextResponse.json({ error: 'Admin accounts cannot be delivery agents.' }, { status: 403 });
  }

  const data = await request.json();
  const before = getUserRoles(session.user.id);
  const isNew = !before.includes('delivery_agent');
  if (isNew && !normalizeNigerianPhone(String(data?.phone ?? ''))) {
    return NextResponse.json({ error: 'Enter a valid Nigerian mobile number, e.g. 08012345678.' }, { status: 400 });
  }
  const FIELDS = ['name', 'email', 'phone', 'streetAddress', 'city', 'country', 'vehicleDetails'];
  const profile = Object.fromEntries(FIELDS.filter((k) => data?.[k] !== undefined).map((k) => [k, data[k]]));
  await upsertDeliveryAgent(session.user.id, profile as any);
  if (isNew) startTradingRole(session.user.id, data.phone, before.includes('vendor'));

  return NextResponse.json({ ok: true });
}
