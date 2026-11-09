import { NextResponse } from 'next/server';
import { sendPasswordReset } from '@/lib/verification';
import { exposeDevCodes } from '@/lib/notify';
import { limitByIp, tooMany } from '@/lib/rate-limit';

/** POST { email } — emails a reset link if the account exists. The reply is the same either way. */
export async function POST(request: Request) {
  // A few requests per IP every 15 minutes, to stop this being used to spam inboxes.
  const rl = limitByIp(request, 'forgot', 5, 15 * 60 * 1000);
  if (!rl.ok) return tooMany(rl.retryAfter);

  const { email } = (await request.json().catch(() => ({}))) as { email?: string };
  if (typeof email !== 'string' || !/^\S+@\S+\.\S+$/.test(email.trim())) {
    return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 });
  }
  const { link } = await sendPasswordReset(email);
  return NextResponse.json({ ok: true, ...(exposeDevCodes && link ? { devLink: link } : {}) });
}
