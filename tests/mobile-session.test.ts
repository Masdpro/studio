/**
 * The mobile app signs in with email and password and gets a token it sends as a Bearer header.
 * The token is the same kind the website's sign-in cookie holds, so all API rules apply unchanged.
 */
import { describe, expect, it, vi } from 'vitest';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { decode } from 'next-auth/jwt';
import { db } from '@/db';
import { users } from '@/db/schema';
import { makeUser, makeVendor, signInAs } from './helpers';

vi.unmock('@/lib/auth');
const { POST: signIn, GET: whoAmI } = await import('@/app/api/mobile/session/route');

let ip = 0;
const post = (body: unknown) => new Request('http://test.local/api/mobile/session', { method: 'POST', body: JSON.stringify(body), headers: { 'content-type': 'application/json', 'fly-client-ip': `10.8.0.${++ip}` } });
async function account(opts: { verified?: boolean; suspended?: boolean } = {}) {
  const id = makeUser();
  const email = `app-${id}@test.local`;
  db.update(users)
    .set({ email, passwordHash: await bcrypt.hash('password123', 4), emailVerifiedAt: opts.verified === false ? null : new Date(), suspendedAt: opts.suspended ? new Date() : null })
    .where(eq(users.id, id))
    .run();
  return { id, email };
}

describe('mobile app sign-in', () => {
  it('returns a token holding the account, and the account and roles', async () => {
    const vendor = makeVendor('approved');
    const email = `vendor-${vendor}@test.local`;
    db.update(users).set({ email, passwordHash: await bcrypt.hash('password123', 4), emailVerifiedAt: new Date() }).where(eq(users.id, vendor)).run();
    const res = await signIn(post({ email: email.toUpperCase(), password: 'password123' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.user).toMatchObject({ id: vendor, roles: expect.arrayContaining(['customer', 'vendor']) });
    const token = await decode({ token: body.token, secret: 'unit-test-secret' });
    expect(token).toMatchObject({ id: vendor, sv: 0 });
    expect(body.expiresAt).toBeGreaterThan(Date.now() + 29 * 864e5);
  });

  it('refuses a wrong password, an unconfirmed email and a suspended account', async () => {
    const ok = await account();
    expect((await signIn(post({ email: ok.email, password: 'wrong-one' }))).status).toBe(401);
    const unverified = await account({ verified: false });
    const r1 = await signIn(post({ email: unverified.email, password: 'password123' }));
    expect(r1.status).toBe(403);
    expect((await r1.json()).code).toBe('EMAIL_NOT_VERIFIED');
    const suspended = await account({ suspended: true });
    expect((await (await signIn(post({ email: suspended.email, password: 'password123' }))).json()).code).toBe('ACCOUNT_SUSPENDED');
  });

  it('locks out after repeated wrong passwords, like the website', async () => {
    const a = await account();
    let last = 0;
    for (let i = 0; i < 12; i++) last = (await signIn(post({ email: a.email, password: `wrong-${i}` }))).status;
    expect(last).toBe(429);
  });

  it('tells the app who is signed in, or 401 when signed out', async () => {
    const vendor = makeVendor('approved');
    signInAs(vendor);
    const res = await whoAmI();
    expect(res.status).toBe(200);
    expect((await res.json()).user).toMatchObject({ id: vendor, roles: expect.arrayContaining(['vendor']) });
    signInAs(null);
    expect((await whoAmI()).status).toBe(401);
  });
});
