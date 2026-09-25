import { getToken } from 'next-auth/jwt';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Role required for each protected path prefix. Checked in order;
 * `true` means "any signed-in role is fine".
 */
const ROUTE_RULES: { prefix: string; role: 'customer' | 'vendor' | 'delivery_agent' | 'admin' | true }[] = [
  { prefix: '/admin', role: 'admin' },
  { prefix: '/vendor/dashboard', role: 'vendor' },
  { prefix: '/delivery-agent', role: 'delivery_agent' },
  { prefix: '/delivery/optimize-route', role: 'delivery_agent' },
  { prefix: '/errands', role: 'customer' },
  { prefix: '/orders', role: true },
  { prefix: '/profile', role: true },
  { prefix: '/notifications', role: true },
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const rule = ROUTE_RULES.find((r) => pathname.startsWith(r.prefix));
  if (!rule) return NextResponse.next();

  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

  if (!token) {
    const loginUrl = new URL('/auth/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (rule.role !== true && token.role !== rule.role) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/vendor/dashboard/:path*',
    '/delivery-agent/:path*',
    '/delivery/optimize-route',
    '/errands/:path*',
    '/orders',
    '/profile',
    '/notifications',
  ],
};
