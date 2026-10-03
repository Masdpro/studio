import { NextResponse } from 'next/server';
import { confirmEmailToken } from '@/lib/verification';

/** The link in the verification email lands here, then bounces to the sign-in page. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get('token') ?? '';
  const uid = url.searchParams.get('uid') ?? '';
  const ok = !!token && !!uid && confirmEmailToken(uid, token);
  const base = process.env.NEXTAUTH_URL ?? url.origin;
  return NextResponse.redirect(new URL(`/auth/login?verified=${ok ? '1' : '0'}`, base));
}
