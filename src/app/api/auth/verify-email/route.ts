import { NextResponse } from 'next/server';
import { confirmEmailCode, confirmEmailToken } from '@/lib/verification';

/** POST { email, code }: checks the 6-digit code from the confirmation email. */
export async function POST(request: Request) {
  const { email, code } = (await request.json().catch(() => ({}))) as { email?: string; code?: string };
  if (!email || !code || !/^\d{6}$/.test(code.trim())) {
    return NextResponse.json({ error: 'Enter the 6-digit code from the email.' }, { status: 400 });
  }
  const result = confirmEmailCode(email, code);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ ok: true });
}

/** Older confirmation emails carried a link; it still lands here and bounces to the sign-in page. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get('token') ?? '';
  const uid = url.searchParams.get('uid') ?? '';
  const ok = !!token && !!uid && confirmEmailToken(uid, token);
  const base = process.env.NEXTAUTH_URL ?? url.origin;
  return NextResponse.redirect(new URL(`/auth/login?verified=${ok ? '1' : '0'}`, base));
}
