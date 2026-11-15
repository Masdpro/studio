import { NextResponse } from 'next/server';
import { encode } from 'next-auth/jwt';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { checkCredentials, currentSessionVersion } from '@/lib/auth';
import { clientIp, limitByIp, tooMany } from '@/lib/rate-limit';
import { getDisplayName, getUserRoles, ownBusinessId } from '@/lib/roles';

/** How long the app stays signed in (the same as the website). */
const MOBILE_SESSION_SECONDS = 30 * 24 * 60 * 60;

const MESSAGES: Record<string, string> = {
  TOO_MANY_ATTEMPTS: 'Too many attempts. Please wait a few minutes and try again.',
  ACCOUNT_SUSPENDED: 'This account has been suspended. Contact Closebuy support.',
  EMAIL_NOT_VERIFIED: 'Please confirm your email address first. Check your inbox for the link.',
};

/**
 * POST { email, password } — signs in from the mobile app. Returns a token the app stores securely and
 * sends as `Authorization: Bearer <token>`; the middleware turns it into the normal sign-in, so every
 * API works the same for the app as for the website (same rules, roles and sign-out-everywhere).
 */
export async function POST(request: Request) {
  const limited = limitByIp(request, 'mobile-login', 20, 15 * 60 * 1000);
  if (!limited.ok) return tooMany(limited.retryAfter);
  const body = (await request.json().catch(() => ({}))) as { email?: string; password?: string };
  if (!body.email || !body.password) return NextResponse.json({ error: 'Enter your email and password.' }, { status: 400 });

  let user;
  try {
    user = await checkCredentials(String(body.email), String(body.password), clientIp(request));
  } catch (err) {
    const code = (err as Error).message;
    return NextResponse.json({ error: MESSAGES[code] ?? 'Could not sign in. Try again.', code }, { status: code === 'TOO_MANY_ATTEMPTS' ? 429 : 403 });
  }
  if (!user) return NextResponse.json({ error: 'That email and password don’t match.', code: 'INVALID' }, { status: 401 });

  const token = await encode({
    secret: process.env.NEXTAUTH_SECRET!,
    maxAge: MOBILE_SESSION_SECONDS,
    token: { sub: user.id, id: user.id, role: user.role, sv: currentSessionVersion(user.id) ?? 0, name: user.name, email: user.email },
  });
  return NextResponse.json({
    token,
    expiresAt: Date.now() + MOBILE_SESSION_SECONDS * 1000,
    user: { id: user.id, email: user.email, name: getDisplayName(user.id) ?? user.name, role: user.role, roles: getUserRoles(user.id), ownVendorId: ownBusinessId(user.id) ?? null },
  });
}

/** GET — who the app is signed in as (the app sends its token as `Authorization: Bearer`). 401 when signed out. */
export async function GET() {
  const session = await getServerSession(authOptions);
  const id = (session?.user as { id?: string } | undefined)?.id;
  if (!id || !session?.user) return NextResponse.json({ error: 'Sign-in required' }, { status: 401 });
  const role = (session.user as { role?: string }).role ?? 'customer';
  return NextResponse.json({
    user: { id, email: session.user.email ?? '', name: getDisplayName(id) ?? session.user.name ?? '', role, roles: getUserRoles(id), ownVendorId: ownBusinessId(id) ?? null },
  });
}
