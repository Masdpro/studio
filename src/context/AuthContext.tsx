'use client';

import { SessionProvider, useSession, signIn as nextAuthSignIn, signOut as nextAuthSignOut } from 'next-auth/react';
import type { ReactNode } from 'react';

export type UserRole = 'customer' | 'vendor' | 'delivery_agent';

export function AuthProvider({ children }: { children: ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}

/**
 * Thin wrapper over NextAuth's useSession so the rest of the app has a
 * small, stable API (`user`, `loading`, `signIn`, `signUp`, `signOut`)
 * regardless of which auth library sits underneath.
 */
export function useAuth() {
  const { data: session, status } = useSession();

  const signIn = async (email: string, password: string) => {
    const result = await nextAuthSignIn('credentials', { email, password, redirect: false });
    if (result?.error) throw new Error('Invalid email or password');
  };

  const signUp = async (email: string, password: string, role: UserRole, displayName?: string) => {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, role, displayName }),
    });
    if (!res.ok) {
      const { error } = await res.json().catch(() => ({ error: 'Registration failed' }));
      throw new Error(error ?? 'Registration failed');
    }
    await signIn(email, password);
  };

  const signOut = () => nextAuthSignOut({ redirect: false });

  return {
    user: session?.user ?? null,
    role: session?.user?.role ?? null,
    loading: status === 'loading',
    signIn,
    signUp,
    signOut,
  };
}
