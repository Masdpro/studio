import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { acceptErrandQuote, getErrandRequestById } from '@/lib/services/errands';

/** The customer accepts one of the quotes submitted for their errand. */
export async function PATCH(request: Request, { params }: { params: Promise<{ errandId: string }> }) {
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

  const { acceptedQuoteId } = (await request.json()) as { acceptedQuoteId: string };
  if (!acceptedQuoteId) {
    return NextResponse.json({ error: 'A quote to accept is required.' }, { status: 400 });
  }

  try {
    await acceptErrandQuote(errandId, acceptedQuoteId);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to accept quote.' }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
