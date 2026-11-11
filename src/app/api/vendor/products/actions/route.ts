import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { inArray } from 'drizzle-orm';
import { authOptions } from '@/lib/auth';
import { db } from '@/db';
import { products } from '@/db/schema';
import { manageableProduct } from '@/lib/product-access';
import { markSoldOut } from '@/lib/services/stock';

const ACTIONS = ['pause', 'resume', 'sold_out'] as const;
type Action = (typeof ACTIONS)[number];

/** POST { ids: string[], action: 'pause' | 'resume' | 'sold_out' } — apply one action to several products. */
export async function POST(req: Request): Promise<Response> {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: 'Sign-in required.' }, { status: 401 });
  const body = (await req.json().catch(() => null)) as { ids?: unknown; action?: unknown } | null;
  const ids = Array.isArray(body?.ids) ? [...new Set(body!.ids.filter((x): x is string => typeof x === 'string'))] : [];
  const action = body?.action as Action;
  if (!ids.length || ids.length > 500 || !ACTIONS.includes(action)) return NextResponse.json({ error: 'Choose products and an action.' }, { status: 400 });

  // All or nothing: every product must be one this person manages.
  for (const id of ids) {
    const access = manageableProduct(id, userId);
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  }
  if (action === 'sold_out') for (const id of ids) markSoldOut(id, { userId });
  else db.update(products).set({ paused: action === 'pause' }).where(inArray(products.id, ids)).run();
  return NextResponse.json({ ok: true, updated: ids.length });
}
