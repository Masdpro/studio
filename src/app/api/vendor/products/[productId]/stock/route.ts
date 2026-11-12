import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { eq } from 'drizzle-orm';
import { authOptions } from '@/lib/auth';
import { db } from '@/db';
import { products } from '@/db/schema';
import { manageableProduct } from '@/lib/product-access';
import { adjustStock, getMovements, getStockRows, locationNames, setStock, StockInputError, type StockInput } from '@/lib/services/stock';
import { log } from '@/lib/log';

type Ctx = { params: Promise<{ productId: string }> };

async function guard(ctx: Ctx): Promise<{ ok: false; res: Response } | { ok: true; productId: string; userId: string; vendorId: string }> {
  const { productId } = await ctx.params;
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return { ok: false, res: NextResponse.json({ error: 'Sign-in required.' }, { status: 401 }) };
  const access = manageableProduct(productId, userId);
  if (!access.ok) return { ok: false, res: NextResponse.json({ error: access.error }, { status: access.status }) };
  return { ok: true, productId, userId, vendorId: access.vendorId };
}

const fail = (err: unknown) =>
  err instanceof StockInputError
    ? NextResponse.json({ error: err.message }, { status: 400 })
    : (log.error('Could not update stock', { area: 'stock', err }), NextResponse.json({ error: 'Could not update stock.' }, { status: 500 }));

/** GET — the product's stock counts, where they're kept, and recent changes. */
export async function GET(_req: Request, ctx: Ctx): Promise<Response> {
  const g = await guard(ctx);
  if (!g.ok) return g.res;
  const names = locationNames(g.vendorId);
  const history = getMovements(g.productId, 40).map((m) => ({
    change: m.change, quantityAfter: m.quantityAfter, reason: m.reason, createdAt: m.createdAt,
    location: names[m.location] ?? 'Removed branch', color: m.color, size: m.size,
  }));
  return NextResponse.json({ rows: getStockRows(g.productId), locations: names, history });
}

/** PUT { rows: [{location, color?, size?, quantity}] | null, lowStockAt? } — replace the counts (null = stop tracking). */
export async function PUT(req: Request, ctx: Ctx): Promise<Response> {
  const g = await guard(ctx);
  if (!g.ok) return g.res;
  const body = (await req.json().catch(() => null)) as { rows?: StockInput[] | null; lowStockAt?: number | null } | null;
  if (!body || !('rows' in body)) return NextResponse.json({ error: 'Send the stock counts.' }, { status: 400 });
  if (body.rows !== null && !Array.isArray(body.rows)) return NextResponse.json({ error: 'Invalid stock counts.' }, { status: 400 });
  if ('lowStockAt' in body) {
    const v = body.lowStockAt;
    if (v !== null && (typeof v !== 'number' || !Number.isInteger(v) || v < 0 || v > 100000)) {
      return NextResponse.json({ error: 'The low-stock alert level must be a whole number (0 or more).' }, { status: 400 });
    }
    db.update(products).set({ lowStockAt: v ?? null }).where(eq(products.id, g.productId)).run();
  }
  try {
    const total = setStock(g.productId, body.rows ?? null, { userId: g.userId });
    return NextResponse.json({ ok: true, stock: total, rows: getStockRows(g.productId) });
  } catch (err) {
    return fail(err);
  }
}

/** PATCH { delta, location?, color?, size? } — add or remove units from one count. */
export async function PATCH(req: Request, ctx: Ctx): Promise<Response> {
  const g = await guard(ctx);
  if (!g.ok) return g.res;
  const body = (await req.json().catch(() => null)) as { delta?: number; location?: string; color?: string; size?: string } | null;
  if (!body || typeof body.delta !== 'number') return NextResponse.json({ error: 'Send how many units to add or remove.' }, { status: 400 });
  try {
    const total = adjustStock(g.productId, { location: body.location, color: body.color, size: body.size }, body.delta, { userId: g.userId });
    return NextResponse.json({ ok: true, stock: total, rows: getStockRows(g.productId) });
  } catch (err) {
    return fail(err);
  }
}
