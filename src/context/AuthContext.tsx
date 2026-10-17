'use client';

import { SessionProvider, useSession, signIn as nextAuthSignIn, signOut as nextAuthSignOut } from 'next-auth/react';
import { useMemo, type ReactNode } from 'react';

export type UserRole = 'customer' | 'vendor' | 'delivery_agent' | 'admin' | 'branch';

export function AuthProvider({ children }: { children: ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}

/**
 * Thin wrapper over NextAuth's useSession so the rest of the app has a
 * small, stable API (`user`, `loading`, `signIn`, `signUp`, `signOut`)
 * regardless of which auth library sits underneath.
 */
export function useAuth() {
  const { data: session, status, update } = useSession();
  const rolesKey = (session?.user?.roles ?? []).join(',');
  const accountRole = session?.user?.role;
  const roles = useMemo<UserRole[]>(() => (rolesKey ? (rolesKey.split(',') as UserRole[]) : accountRole ? [accountRole] : []), [rolesKey, accountRole]);

  const signIn = async (email: string, password: string) => {
    const result = await nextAuthSignIn('credentials', { email, password, redirect: false });
    if (result?.error) {
      if (result.error.includes('EMAIL_NOT_VERIFIED')) throw new Error('EMAIL_NOT_VERIFIED');
      throw new Error('Invalid email or password');
    }
  };

  /**
   * Creates the account but does NOT sign in: the user must confirm their email first.
   * `extra` carries a phone number and (for vendors/agents) the business/agent profile.
   * Returns a dev-only `devLink` to show on screen, since no real emails are sent yet.
   */
  const signUp = async (
    email: string,
    password: string,
    role: UserRole,
    displayName?: string,
    extra?: { phone?: string; profile?: Record<string, unknown> },
  ): Promise<{ devLink?: string }> => {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, role, displayName, ...extra }),
    });
    if (!res.ok) {
      const { error } = await res.json().catch(() => ({ error: 'Registration failed' }));
      throw new Error(error ?? 'Registration failed');
    }
    const { devLink } = await res.json().catch(() => ({}));
    return { devLink };
  };

  const signOut = () => nextAuthSignOut({ redirect: false });

  return {
    user: session?.user ?? null,
    role: session?.user?.role ?? null,
    roles,
    isVendor: roles.includes('vendor'),
    isAgent: roles.includes('delivery_agent'),
    refresh: () => update(),
    loading: status === 'loading',
    signIn,
    signUp,
    signOut,
  };
}
