import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  createErrandRequest,
  getErrandRequestsForCustomer,
  getOpenErrandRequestsForAgent,
} from '@/lib/services/errands';

/** Customers see their own errand requests; delivery agents see ones still open to quote on. */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'You must be signed in.' }, { status: 401 });
  }

  const { id, role } = session.user;
  const errands =
    role === 'delivery_agent' ? await getOpenErrandRequestsForAgent(id) : await getErrandRequestsForCustomer(id);

  return NextResponse.json({ errands });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'You must be signed in to request an errand.' }, { status: 401 });
  }

  const body = await request.json();
  const { itemsDescription, preferredStore, deliveryAddress } = body as {
    itemsDescription: string;
    preferredStore?: string;
    deliveryAddress: string;
  };

  if (!itemsDescription?.trim() || !deliveryAddress?.trim()) {
    return NextResponse.json({ error: 'Items description and delivery address are required.' }, { status: 400 });
  }

  const id = await createErrandRequest({
    customerId: session.user.id,
    itemsDescription,
    preferredStore,
    deliveryAddress,
  });

  return NextResponse.json({ id }, { status: 201 });
}
