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
  if (session.user.role !== 'delivery_agent') {
    return NextResponse.json({ error: 'Only delivery agent accounts can create this profile.' }, { status: 403 });
  }

  const data = await request.json();
  await upsertDeliveryAgent(session.user.id, data);

  return NextResponse.json({ ok: true });
}
