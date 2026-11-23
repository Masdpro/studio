import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';
import { api } from './api';
import { useSession } from './session';
import type { CartItem, Product } from './types';

const KEY = 'closebuy.cart';
/** Whose cart is on this phone: a user id, or '' for a signed-out (guest) cart. */
const OWNER_KEY = 'closebuy.cart.owner';
const PUSH_DELAY_MS = 500;

/** Guest lines join the account's cart; the same product, colour and size keep the larger quantity. */
function mergeCarts(saved: CartItem[], guest: CartItem[]): CartItem[] {
  const out = saved.map((i) => ({ ...i }));
  for (const g of guest) {
    const hit = out.find((i) => lineKey(i) === lineKey(g));
    if (hit) hit.quantity = Math.max(hit.quantity, g.quantity);
    else out.push({ ...g });
  }
  return out.slice(0, 100);
}
const lineKey = (i: { productId: string; color?: string; size?: string }) => `${i.productId}|${i.color ?? ''}|${i.size ?? ''}`;

type CartState = {
  items: CartItem[];
  count: number;
  subtotal: number;
  add: (p: Product, qty: number, opts?: { color?: string; size?: string; max?: number }) => void;
  setQty: (item: CartItem, qty: number) => void;
  remove: (item: CartItem) => void;
  clear: () => void;
};

const Ctx = createContext<CartState | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((v) => v && setItems(JSON.parse(v)))
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);
  useEffect(() => {
    if (loaded) AsyncStorage.setItem(KEY, JSON.stringify(items)).catch(() => {});
  }, [items, loaded]);

  // ── Signed in: the cart lives on the account, so the app and the website show the same one. ──
  const { ready, user } = useSession();
  const userId = user?.id ?? null;
  const [synced, setSynced] = useState(false);
  const fromServer = useRef(false); // the latest `items` came from the server: don't send it back
  const pending = useRef<CartItem[] | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pull = async (): Promise<CartItem[] | null> => {
    try {
      const r = await api<{ items?: CartItem[] }>('/api/cart');
      return Array.isArray(r.items) ? r.items : [];
    } catch {
      return null;
    }
  };
  const push = (next: CartItem[]) => {
    pending.current = null;
    api('/api/cart', { method: 'PUT', body: { items: next } }).catch(() => {});
  };

  // On sign-in (or opening the app signed in), load the account's cart; guest picks on this phone are added to it.
  useEffect(() => {
    if (!loaded || !ready) return;
    let cancelled = false;
    (async () => {
      const owner = (await AsyncStorage.getItem(OWNER_KEY).catch(() => null)) ?? '';
      if (!userId) {
        setSynced(false);
        if (owner) {
          await AsyncStorage.setItem(OWNER_KEY, '').catch(() => {});
          fromServer.current = true;
          setItems([]);
        }
        return;
      }
      const saved = await pull();
      if (cancelled || saved === null) return;
      const local: CartItem[] = JSON.parse((await AsyncStorage.getItem(KEY).catch(() => null)) ?? '[]');
      const guest = owner === '' ? local : [];
      const next = guest.length ? mergeCarts(saved, guest) : saved;
      await AsyncStorage.setItem(OWNER_KEY, userId).catch(() => {});
      fromServer.current = !guest.length;
      setItems(next);
      setSynced(true);
      if (guest.length) push(next);
    })().catch(() => {});
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, ready, userId]);

  // Save each change to the account a moment later, so quick +/- taps send one update.
  useEffect(() => {
    if (!userId || !synced) return;
    if (fromServer.current) {
      fromServer.current = false;
      return;
    }
    pending.current = items;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      timer.current = null;
      push(items);
    }, PUSH_DELAY_MS);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, userId, synced]);

  // Coming back to the app picks up changes made on the website; going to the background saves straight away.
  useEffect(() => {
    if (!userId || !synced) return;
    const sub = AppState.addEventListener('change', async (state) => {
      if (state !== 'active') {
        if (pending.current) {
          if (timer.current) clearTimeout(timer.current);
          timer.current = null;
          push(pending.current);
        }
        return;
      }
      if (pending.current) return;
      const saved = await pull();
      if (saved === null) return;
      setItems((cur) => {
        if (JSON.stringify(cur) === JSON.stringify(saved)) return cur;
        fromServer.current = true;
        return saved;
      });
    });
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, synced]);

  const value = useMemo<CartState>(() => {
    const cap = (n: number, max?: number) => Math.max(1, max != null ? Math.min(n, max) : n);
    return {
      items,
      count: items.reduce((s, i) => s + i.quantity, 0),
      subtotal: items.reduce((s, i) => s + i.price * i.quantity, 0),
      add: (p, qty, o = {}) =>
        setItems((cur) => {
          const line: CartItem = {
            productId: p.id,
            vendorId: p.vendorId,
            name: p.name,
            price: p.isAwoof && p.discountPrice ? p.discountPrice : p.price,
            quantity: qty,
            imageUrl: p.imageUrl,
            color: o.color,
            size: o.size,
            maxQuantity: o.max ?? p.stock,
          };
          const k = lineKey(line);
          const found = cur.find((i) => lineKey(i) === k);
          if (found) return cur.map((i) => (lineKey(i) === k ? { ...i, quantity: cap(i.quantity + qty, line.maxQuantity) } : i));
          return [...cur, { ...line, quantity: cap(qty, line.maxQuantity) }];
        }),
      setQty: (item, qty) => setItems((cur) => cur.map((i) => (lineKey(i) === lineKey(item) ? { ...i, quantity: cap(qty, i.maxQuantity) } : i))),
      remove: (item) => setItems((cur) => cur.filter((i) => lineKey(i) !== lineKey(item))),
      clear: () => setItems([]),
    };
  }, [items]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useCart outside CartProvider');
  return c;
}
