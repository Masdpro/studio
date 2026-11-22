import { getToken } from 'next-auth/jwt';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { KEEP_COOKIE } from '@/lib/keep-signed-in';
import { SHOP_PATH, START_PATH } from '@/lib/site';

/**
 * Role required for each protected path prefix. Checked in order;
 * `true` means "any signed-in role is fine".
 */
const ROUTE_RULES: { prefix: string; role: 'customer' | 'vendor' | 'delivery_agent' | 'provider' | 'admin' | 'branch' | true }[] = [
  { prefix: '/admin', role: 'admin' },
  { prefix: '/branch', role: 'branch' },
  { prefix: '/vendor/dashboard', role: 'vendor' },
  { prefix: '/vendor/orders', role: 'vendor' },
  { prefix: '/provider', role: 'provider' },
  { prefix: '/delivery-agent', role: 'delivery_agent' },
  { prefix: '/errands', role: 'customer' },
  { prefix: '/orders', role: true },
  { prefix: '/bookings', role: true },
  { prefix: '/profile', role: true },
  { prefix: '/account', role: true },
  { prefix: '/notifications', role: true },
  { prefix: '/wallet', role: true },
  { prefix: '/checkout', role: true },
];

/** The pages that need a sign-in: a trailing /* covers everything under that path, otherwise the exact path only. */
const PROTECTED = ['/admin/*', '/branch/*', '/vendor/dashboard/*', '/vendor/orders', '/provider/*', '/delivery-agent/*', '/errands/*', '/orders', '/bookings', '/profile', '/account/*', '/notifications', '/wallet', '/checkout/*'];
function isProtected(pathname: string) {
  return PROTECTED.some((p) => (p.endsWith('/*') ? pathname === p.slice(0, -2) || pathname.startsWith(p.slice(0, -1)) : pathname === p));
}

/**
 * Every request gets an ID (Fly's own when there is one) in the x-request-id header, on the way in
 * (so server logs can include it) and on the way out (so it can be matched from the browser).
 */
function withRequestId(request: NextRequest) {
  const id = request.headers.get('x-request-id') || request.headers.get('fly-request-id') || crypto.randomUUID();
  const headers = new Headers(request.headers);
  headers.set('x-request-id', id);
  return { id, headers };
}

/**
 * The mobile app signs in with a token (POST /api/mobile/session) and sends it as `Authorization: Bearer …`.
 * For API calls it is passed on as the normal sign-in cookie, so every API route treats the app exactly like
 * the website. Only for /api/, and never when the request already carries a sign-in cookie.
 */
function withAppToken(request: NextRequest, headers: Headers) {
  const auth = request.headers.get('authorization');
  if (!auth?.startsWith('Bearer ') || !request.nextUrl.pathname.startsWith('/api/')) return;
  const token = auth.slice(7).trim();
  if (!token || /[;\s,]/.test(token)) return;
  const cookie = request.headers.get('cookie') ?? '';
  if (/(^|;\s*)(__Secure-)?next-auth\.session-token=/.test(cookie)) return;
  const add = `next-auth.session-token=${token}; __Secure-next-auth.session-token=${token}`;
  headers.set('cookie', cookie ? `${cookie}; ${add}` : add);
}

/** The website's sign-in cookies (next-auth may split a long one into .0, .1, …). */
const SESSION_COOKIE = /^(__Secure-)?next-auth\.session-token(\.\d+)?$/;

/**
 * "Keep me signed in" is the person's choice at sign-in. The sign-in form sets KEEP_COOKIE alongside the
 * session: for 30 days when they ticked the box, or only until the browser closes when they didn't.
 * A sign-in cookie without it (the browser was closed, or 30 days have passed) is dropped here,
 * so the visitor is signed out and asked to sign in again.
 */
function dropUnkeptSession(request: NextRequest, headers: Headers) {
  const all = request.cookies.getAll();
  const expired = all.map((c) => c.name).filter((n) => SESSION_COOKIE.test(n));
  if (!expired.length || request.cookies.has(KEEP_COOKIE)) return { expired: [] as string[], cookies: new Map(all.map((c) => [c.name, c.value])) };
  const kept = all.filter((c) => !SESSION_COOKIE.test(c.name));
  if (kept.length) headers.set('cookie', kept.map((c) => `${c.name}=${c.value}`).join('; '));
  else headers.delete('cookie');
  return { expired, cookies: new Map(kept.map((c) => [c.name, c.value])) };
}

export async function middleware(request: NextRequest) {
  const { id, headers } = withRequestId(request);
  const { expired, cookies } = dropUnkeptSession(request, headers);
  withAppToken(request, headers);
  const tag = (res: NextResponse) => {
    res.headers.set('x-request-id', id);
    for (const name of expired) res.cookies.set(name, '', { path: '/', maxAge: 0, secure: name.startsWith('__Secure-') });
    return res;
  };
  const { pathname } = request.nextUrl;
  // Read the sign-in from the cookies as they stand after the check above.
  const signedIn = () => getToken({ req: { cookies, headers: request.headers } as never, secret: process.env.NEXTAUTH_SECRET });

  // "Start shopping": straight to the shop when signed in, otherwise sign in first and land in the shop.
  if (pathname === START_PATH) {
    if (await signedIn()) return tag(NextResponse.redirect(new URL(SHOP_PATH, request.url)));
    const loginUrl = new URL('/auth/login', request.url);
    loginUrl.searchParams.set('callbackUrl', SHOP_PATH);
    return tag(NextResponse.redirect(loginUrl));
  }
  const rule = isProtected(pathname) ? ROUTE_RULES.find((r) => pathname.startsWith(r.prefix)) : undefined;
  if (!rule) return tag(NextResponse.next({ request: { headers } }));

  const token = await signedIn();

  if (!token) {
    const loginUrl = new URL('/auth/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return tag(NextResponse.redirect(loginUrl));
  }

  if (rule.role !== true && token.role !== rule.role && !((token.roles as string[] | undefined) ?? []).includes(rule.role)) {
    return tag(NextResponse.redirect(new URL('/shop', request.url)));
  }

  return tag(NextResponse.next({ request: { headers } }));
}

export const config = {
  // Everything except build files and static assets (the role rules above decide what is protected).
  matcher: ['/((?!_next/static|_next/image|favicon.ico|catalog/|mediapipe/|fonts/|.*\\.(?:png|jpg|jpeg|webp|svg|gif|ico|css|js|map|woff2?)$).*)'],
};
