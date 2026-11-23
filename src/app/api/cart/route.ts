import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getSavedCart, saveCart } from '@/lib/services/carts';

/** The signed-in customer's cart, shared by the website and the phone app. */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'You must be signed in.' }, { status: 401 });
  return NextResponse.json(getSavedCart(session.user.id), { headers: { 'Cache-Control': 'no-store' } });
}

export async function PUT(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'You must be signed in.' }, { status: 401 });
  const raw = await request.text();
  if (raw.length > 200_000) return NextResponse.json({ error: 'That cart is too big.' }, { status: 413 });
  let body: { items?: unknown };
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: 'Invalid cart.' }, { status: 400 });
  }
  return NextResponse.json(saveCart(session.user.id, body.items));
}
