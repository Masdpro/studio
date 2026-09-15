import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createErrandQuote, getErrandRequestById, getQuotesForErrand } from '@/lib/services/errands';
import { getDeliveryAgentById } from '@/lib/services/deliveryAgents';

/** The errand's customer views quotes submitted so far, with the quoting agent's name attached. */
export async function GET(request: Request, { params }: { params: Promise<{ errandId: string }> }) {
  const { errandId } = await params;

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'You must be signed in.' }, { status: 401 });
  }

  const errand = await getErrandRequestById(errandId);
  if (!errand) {
    return NextResponse.json({ error: 'Errand not found.' }, { status: 404 });
  }
  if (errand.customerId !== session.user.id) {
    return NextResponse.json({ error: 'You do not have access to this errand.' }, { status: 403 });
  }

  const quotes = await getQuotesForErrand(errandId);
  const quotesWithAgentNames = await Promise.all(
    quotes.map(async (quote) => {
      const agent = await getDeliveryAgentById(quote.agentId);
      return { ...quote, agentName: agent?.name ?? `Agent ${quote.agentId.substring(0, 6)}...` };
    })
  );

  return NextResponse.json({ quotes: quotesWithAgentNames });
}

/** A delivery agent submits a quote for an open errand. */
export async function POST(request: Request, { params }: { params: Promise<{ errandId: string }> }) {
  const { errandId } = await params;

  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== 'delivery_agent') {
    return NextResponse.json({ error: 'Only delivery agents can submit quotes.' }, { status: 403 });
  }

  const errand = await getErrandRequestById(errandId);
  if (!errand) {
    return NextResponse.json({ error: 'Errand not found.' }, { status: 404 });
  }
  if (errand.assignedAgentId) {
    return NextResponse.json({ error: 'This errand already has an assigned agent.' }, { status: 400 });
  }

  const { estimatedItemCost, deliveryFee, agentNotes } = (await request.json()) as {
    estimatedItemCost: number;
    deliveryFee: number;
    agentNotes?: string;
  };

  if (typeof estimatedItemCost !== 'number' || typeof deliveryFee !== 'number') {
    return NextResponse.json({ error: 'Estimated item cost and delivery fee are required.' }, { status: 400 });
  }

  const id = await createErrandQuote({
    errandRequestId: errandId,
    agentId: session.user.id,
    estimatedItemCost,
    deliveryFee,
    agentNotes,
  });

  return NextResponse.json({ id }, { status: 201 });
}
