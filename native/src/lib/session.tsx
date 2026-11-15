import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, onApiSignedOut, setApiToken } from './api';
import { storage } from './storage';
import type { Role, User } from './types';
import { queryClient } from './query';

type SessionState = {
  ready: boolean;
  user: User | null;
  signIn: (email: string, password: string) => Promise<User>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
  has: (role: Role) => boolean;
};

const Ctx = createContext<SessionState | null>(null);
const TOKEN = 'closebuy.token';
const USER = 'closebuy.user';

export function SessionProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  const clear = useCallback(async () => {
    setApiToken(null);
    setUser(null);
    queryClient.clear();
    await Promise.all([storage.set(TOKEN, null), storage.set(USER, null)]);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const { user: u } = await api<{ user: User }>('/api/mobile/session');
      setUser(u);
      await storage.set(USER, JSON.stringify(u));
    } catch (e: any) {
      if (e?.status === 401) await clear();
    }
  }, [clear]);

  useEffect(() => {
    onApiSignedOut(() => void clear());
    (async () => {
      const [t, u] = await Promise.all([storage.get(TOKEN), storage.get(USER)]);
      if (t) {
        setApiToken(t);
        try {
          if (u) setUser(JSON.parse(u));
        } catch {
          /* ignore */
        }
        setReady(true);
        void refresh();
      } else setReady(true);
    })();
  }, [clear, refresh]);

  const signIn = useCallback(async (email: string, password: string) => {
    const res = await api<{ token: string; user: User }>('/api/mobile/session', { body: { email: email.trim(), password } });
    setApiToken(res.token);
    await Promise.all([storage.set(TOKEN, res.token), storage.set(USER, JSON.stringify(res.user))]);
    queryClient.clear();
    setUser(res.user);
    return res.user;
  }, []);

  const value = useMemo<SessionState>(
    () => ({ ready, user, signIn, signOut: clear, refresh, has: (r) => !!user?.roles?.includes(r) }),
    [ready, user, signIn, clear, refresh]
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSession() {
  const s = useContext(Ctx);
  if (!s) throw new Error('useSession outside SessionProvider');
  return s;
}
