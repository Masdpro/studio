import { NextResponse } from 'next/server';
import { sendPasswordReset } from '@/lib/verification';
import { exposeDevCodes } from '@/lib/notify';

const HITS = new Map<string, number[]>();

/** POST { email } — emails a reset link if the account exists. The reply is the same either way. */
export async function POST(request: Request) {
  // A few requests per address every 15 minutes, to stop this being used to spam inboxes.
  const ip = (request.headers.get('x-forwarded-for') ?? 'unknown').split(',')[0].trim();
  const now = Date.now();
  const hits = (HITS.get(ip) ?? []).filter((t) => now - t < 15 * 60 * 1000);
  if (hits.length >= 5) return NextResponse.json({ error: 'Too many requests. Please try again in a few minutes.' }, { status: 429 });
  hits.push(now);
  HITS.set(ip, hits);

  const { email } = (await request.json().catch(() => ({}))) as { email?: string };
  if (typeof email !== 'string' || !/^\S+@\S+\.\S+$/.test(email.trim())) {
    return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 });
  }
  const { link } = await sendPasswordReset(email);
  return NextResponse.json({ ok: true, ...(exposeDevCodes && link ? { devLink: link } : {}) });
}
