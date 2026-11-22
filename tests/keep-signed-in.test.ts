/**
 * "Start shopping" asks visitors to sign in first, and "Keep me signed in" is the person's choice:
 * a sign-in without the keep cookie (browser closed, or 30 days passed) is signed out.
 */
import { describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { encode } from 'next-auth/jwt';
import { middleware } from '@/middleware';
import { KEEP_COOKIE, KEEP_SECONDS } from '@/lib/keep-signed-in';
import { makeUser } from './helpers';

const secret = process.env.NEXTAUTH_SECRET!;
const sessionFor = async (id: string, loginAt = Math.floor(Date.now() / 1000)) => encode({ token: { id, role: 'customer', sv: 0, loginAt }, secret });
const req = (path: string, cookie = '') => new NextRequest(`http://localhost${path}`, { headers: cookie ? { cookie } : {} });

describe('Start shopping and keep me signed in', () => {
  it('Start shopping sends a signed-out visitor to sign in, then on to the shop', async () => {
    const res = await middleware(req('/start'));
    expect(res.status).toBe(307);
    const to = new URL(res.headers.get('location')!);
    expect(to.pathname).toBe('/auth/login');
    expect(to.searchParams.get('callbackUrl')).toBe('/shop');
  });

  it('Start shopping goes straight to the shop when signed in', async () => {
    const token = await sessionFor(makeUser());
    const res = await middleware(req('/start', `next-auth.session-token=${token}; ${KEEP_COOKIE}=remember`));
    expect(new URL(res.headers.get('location')!).pathname).toBe('/shop');
  });

  it('a sign-in without the keep cookie is signed out and its cookie cleared', async () => {
    const token = await sessionFor(makeUser());
    const res = await middleware(req('/start', `next-auth.session-token=${token}`));
    expect(new URL(res.headers.get('location')!).pathname).toBe('/auth/login');
    expect(res.headers.get('set-cookie')).toMatch(/next-auth\.session-token=;.*Max-Age=0/i);

    const page = await middleware(req('/profile', `next-auth.session-token=${token}`));
    expect(new URL(page.headers.get('location')!).pathname).toBe('/auth/login');
  });

  it('sessions end 30 days after sign-in, even when kept', async () => {
    // The test setup replaces @/lib/auth with a stub; load the real one here.
    const { authOptions } = await vi.importActual<typeof import('@/lib/auth')>('@/lib/auth');
    const jwt = authOptions.callbacks!.jwt!;
    const id = makeUser();
    const fresh = { id, sv: 0, loginAt: Math.floor(Date.now() / 1000) - 60 };
    await expect(jwt({ token: fresh } as never)).resolves.toMatchObject({ id });
    const old = { id, sv: 0, loginAt: Math.floor(Date.now() / 1000) - KEEP_SECONDS - 60 };
    await expect(jwt({ token: old } as never)).rejects.toThrow('SESSION_REVOKED');
  });
});
