import { getUserRoles, getDisplayName, ownBusinessId } from '@/lib/roles';

import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

import { clearFailedPasswords, isLockedOut, recordFailedPassword, isIpLockedOut, recordFailedIp } from '@/lib/login-throttle';

/**
 * The password check shared by the website sign-in and the mobile app's sign-in (/api/mobile/session).
 * Returns null for a wrong email or password; throws TOO_MANY_ATTEMPTS, ACCOUNT_SUSPENDED or EMAIL_NOT_VERIFIED.
 */
export async function checkCredentials(rawEmail: string, password: string, ip: string) {
  if (isIpLockedOut(ip)) throw new Error('TOO_MANY_ATTEMPTS');
  const email = rawEmail.trim().toLowerCase();
  if (isLockedOut(email)) throw new Error('TOO_MANY_ATTEMPTS');

  const user = db.select().from(users).where(eq(users.email, email)).get();
  const valid = user ? await bcrypt.compare(password, user.passwordHash) : false;
  if (!user || !valid) {
    recordFailedPassword(email);
    recordFailedIp(ip);
    return null;
  }
  clearFailedPasswords(email);

  // Only reveal these once the password is right, so they can't be used to probe for accounts.
  if (user.suspendedAt) throw new Error('ACCOUNT_SUSPENDED');
  if (!user.emailVerifiedAt) throw new Error('EMAIL_NOT_VERIFIED');

  return { id: user.id, email: user.email, name: user.displayName ?? user.email, role: user.role };
}

export function currentSessionVersion(userId: string): number | null {
  const u = db.select({ v: users.sessionVersion }).from(users).where(eq(users.id, userId)).get();
  return u ? u.v ?? 0 : null;
}

export const authOptions: NextAuthOptions = {
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/login',
  },
  providers: [
    CredentialsProvider({
      name: 'Email and password',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) return null;
        // Trust the proxy headers Fly/Cloudflare set; '' falls back to 'unknown' (never locked).
        const h = (req?.headers ?? {}) as Record<string, string | undefined>;
        const ip = (h['fly-client-ip'] || (h['x-forwarded-for'] ?? '').split(',')[0] || h['x-real-ip'] || 'unknown').trim() || 'unknown';
        return checkCredentials(credentials.email, credentials.password, ip);
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        token.sv = currentSessionVersion(user.id) ?? 0;
      }
      if (token.id) {
        // A password change/reset bumps the account's version: older sessions on any device end here.
        const sv = currentSessionVersion(token.id as string);
        // Throwing makes next-auth clear the session cookie and treat the visitor as signed out.
        if (sv === null || sv !== ((token.sv as number | undefined) ?? 0)) throw new Error('SESSION_REVOKED');
        token.roles = getUserRoles(token.id as string);
        token.ownVendorId = ownBusinessId(token.id as string) ?? undefined;
        token.name = getDisplayName(token.id as string) ?? token.name;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
        (session.user as any).roles = token.roles;
        (session.user as any).ownVendorId = token.ownVendorId;
      }
      return session;
    },
  },
};
