import { getUserRoles, getDisplayName } from '@/lib/roles';

import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

// Wrong-password throttle: after 5 misses on one email within 15 minutes,
// that email is locked for 15 minutes. Stops password guessing.
const FAILS = new Map<string, number[]>();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILS = 5;
function recentFails(email: string) {
  const now = Date.now();
  const list = (FAILS.get(email) ?? []).filter((t) => now - t < WINDOW_MS);
  FAILS.set(email, list);
  return list;
}

function currentSessionVersion(userId: string): number | null {
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
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const email = credentials.email.trim().toLowerCase();
        if (recentFails(email).length >= MAX_FAILS) throw new Error('TOO_MANY_ATTEMPTS');

        const user = db.select().from(users).where(eq(users.email, email)).get();
        const valid = user ? await bcrypt.compare(credentials.password, user.passwordHash) : false;
        if (!user || !valid) {
          recentFails(email).push(Date.now());
          return null;
        }
        FAILS.delete(email);

        // Only reveal this once the password is right, so it can't be used to probe for accounts.
        if (!user.emailVerifiedAt) throw new Error('EMAIL_NOT_VERIFIED');

        return {
          id: user.id,
          email: user.email,
          name: user.displayName ?? user.email,
          role: user.role,
        };
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
        token.name = getDisplayName(token.id as string) ?? token.name;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
        (session.user as any).roles = token.roles;
      }
      return session;
    },
  },
};
