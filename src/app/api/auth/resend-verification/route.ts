import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { users } from '@/db/schema';
import { sendEmailVerification } from '@/lib/verification';
import { exposeDevCodes } from '@/lib/notify';
import { limitByIp, tooMany } from '@/lib/rate-limit';

/** Always answers the same way so it can't be used to discover which emails have accounts. */
export async function POST(request: Request) {
  const rl = limitByIp(request, 'resend', 5, 15 * 60 * 1000);
  if (!rl.ok) return tooMany(rl.retryAfter);
  const { email } = (await request.json().catch(() => ({}))) as { email?: string };
  const user = email ? db.select().from(users).where(eq(users.email, email.trim().toLowerCase())).get() : null;
  let devCode: string | undefined;
  if (user && !user.emailVerifiedAt) {
    const sent = await sendEmailVerification(user.id);
    if (exposeDevCodes && 'code' in sent) devCode = sent.code;
  }
  return NextResponse.json({ ok: true, devCode });
}
