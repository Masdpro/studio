import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { resetPasswordWithToken } from '@/lib/verification';
import { limitByIp, tooMany } from '@/lib/rate-limit';

/** POST { uid, token, password } — sets a new password from an emailed reset link. */
export async function POST(request: Request) {
  // Caps guesses at a reset token from one source (the token itself is 256-bit).
  const rl = limitByIp(request, 'reset', 15, 15 * 60 * 1000);
  if (!rl.ok) return tooMany(rl.retryAfter);
  const { uid, token, password } = (await request.json().catch(() => ({}))) as { uid?: string; token?: string; password?: string };
  if (typeof uid !== 'string' || typeof token !== 'string' || !uid || !token) {
    return NextResponse.json({ error: 'This reset link is incomplete. Please request a new one.' }, { status: 400 });
  }
  if (typeof password !== 'string' || password.length < 8 || password.length > 72) {
    return NextResponse.json({ error: 'Choose a password of 8 to 72 characters.' }, { status: 400 });
  }
  const ok = await resetPasswordWithToken(uid, token, await bcrypt.hash(password, 10));
  if (!ok) return NextResponse.json({ error: 'This reset link is invalid or has expired. Please request a new one.' }, { status: 400 });
  return NextResponse.json({ ok: true });
}
