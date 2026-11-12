import { getToken } from 'next-auth/jwt';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Role required for each protected path prefix. Checked in order;
 * `true` means "any signed-in role is fine".
 */
const ROUTE_RULES: { prefix: string; role: 'customer' | 'vendor' | 'delivery_agent' | 'admin' | 'branch' | true }[] = [
  { prefix: '/admin', role: 'admin' },
  { prefix: '/branch', role: 'branch' },
  { prefix: '/vendor/dashboard', role: 'vendor' },
  { prefix: '/vendor/orders', role: 'vendor' },
  { prefix: '/delivery-agent', role: 'delivery_agent' },
  { prefix: '/errands', role: 'customer' },
  { prefix: '/orders', role: true },
  { prefix: '/profile', role: true },
  { prefix: '/account', role: true },
  { prefix: '/notifications', role: true },
  { prefix: '/wallet', role: true },
];

/** The pages that need a sign-in: a trailing /* covers everything under that path, otherwise the exact path only. */
const PROTECTED = ['/admin/*', '/branch/*', '/vendor/dashboard/*', '/vendor/orders', '/delivery-agent/*', '/errands/*', '/orders', '/profile', '/account/*', '/notifications', '/wallet'];
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

export async function middleware(request: NextRequest) {
  const { id, headers } = withRequestId(request);
  const tag = (res: NextResponse) => {
    res.headers.set('x-request-id', id);
    return res;
  };
  const { pathname } = request.nextUrl;
  const rule = isProtected(pathname) ? ROUTE_RULES.find((r) => pathname.startsWith(r.prefix)) : undefined;
  if (!rule) return tag(NextResponse.next({ request: { headers } }));

  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

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
