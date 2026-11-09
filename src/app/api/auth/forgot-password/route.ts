import { NextResponse } from 'next/server';
import { sendPasswordReset } from '@/lib/verification';
import { exposeDevCodes } from '@/lib/notify';
import { clientIp, limitByIp, tooMany } from '@/lib/rate-limit';
import { verifyTurnstile } from '@/lib/turnstile';

/** POST { email } — emails a reset link if the account exists. The reply is the same either way. */
export async function POST(request: Request) {
  // A few requests per IP every 15 minutes, to stop this being used to spam inboxes.
  const rl = limitByIp(request, 'forgot', 5, 15 * 60 * 1000);
  if (!rl.ok) return tooMany(rl.retryAfter);

  const { email, turnstileToken } = (await request.json().catch(() => ({}))) as { email?: string; turnstileToken?: unknown };
  const human = await verifyTurnstile(turnstileToken, clientIp(request));
  if (!human.ok) return NextResponse.json({ error: human.error, code: 'CAPTCHA_FAILED' }, { status: 403 });
  if (typeof email !== 'string' || !/^\S+@\S+\.\S+$/.test(email.trim())) {
    return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 });
  }
  const { link } = await sendPasswordReset(email);
  return NextResponse.json({ ok: true, ...(exposeDevCodes && link ? { devLink: link } : {}) });
}
