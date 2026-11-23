'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useSession } from 'next-auth/react';
import type { CartItem, Product } from '@/lib/types';
import { cartLineKey } from '@/lib/cart-line';
import { mergeCarts } from '@/lib/cart-sync';

const STORAGE_KEY = 'closebuy-cart';
/** Whose cart is in this browser: a user id, or '' for a signed-out (guest) cart. */
const OWNER_KEY = 'closebuy-cart-owner';
const PUSH_DELAY_MS = 500;

const readOwner = () => {
  try {
    return window.localStorage.getItem(OWNER_KEY) ?? '';
  } catch {
    return '';
  }
};
const writeOwner = (id: string) => {
  try {
    window.localStorage.setItem(OWNER_KEY, id);
  } catch {
    /* storage blocked */
  }
};

type CartContextValue = {
  items: CartItem[];
  addItem: (product: Product, quantity?: number, options?: { color?: string; size?: string }) => void;
  /** `lineKey` is cartLineKey(item): the product plus its colour/size. */
  updateQuantity: (lineKey: string, quantity: number) => void;
  removeItem: (lineKey: string) => void;
  clear: () => void;
  subtotal: number;
  itemCount: number;
};

const CartContext = createContext<CartContextValue | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // Load from localStorage once, on mount.
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) setItems(JSON.parse(stored));
    } catch {
      // ignore malformed/blocked storage — cart just starts empty
    } finally {
      setHydrated(true);
    }
  }, []);

  // Persist on every change, after the initial load.
  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // ignore (e.g. private browsing storage limits)
    }
  }, [items, hydrated]);

  // ── Signed in: the cart lives on the account, so the website and the app show the same one. ──
  const { data: session, status } = useSession();
  const userId = status === 'authenticated' ? session?.user?.id ?? null : null;
  const [synced, setSynced] = useState(false); // the account's cart has been loaded for this user
  const fromServer = useRef(false); // the latest `items` came from the server: don't send it back
  const pushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pull = useCallback(async (): Promise<CartItem[] | null> => {
    try {
      const res = await fetch('/api/cart', { cache: 'no-store' });
      if (!res.ok) return null;
      const data = (await res.json()) as { items?: CartItem[] };
      return Array.isArray(data.items) ? data.items : [];
    } catch {
      return null;
    }
  }, []);

  const pending = useRef<CartItem[] | null>(null); // a change not yet sent
  const push = useCallback(async (next: CartItem[]) => {
    pending.current = null;
    try {
      // keepalive lets the save finish even if the page is closing.
      await fetch('/api/cart', { method: 'PUT', keepalive: true, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items: next }) });
    } catch {
      // offline: the next change or visit will save it
    }
  }, []);

  // On sign-in (or a page load while signed in), load the account's cart. Anything picked as a
  // guest on this device is added to it; a different person's leftover cart is dropped.
  useEffect(() => {
    if (!hydrated || status === 'loading') return;
    if (!userId) {
      setSynced(false);
      if (readOwner()) {
        // Signed out: don't leave the last account's cart showing.
        writeOwner('');
        fromServer.current = true;
        setItems([]);
      }
      return;
    }
    let cancelled = false;
    (async () => {
      const saved = await pull();
      if (cancelled || saved === null) return;
      const owner = readOwner();
      let local: CartItem[] = [];
      try {
        local = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '[]');
      } catch {
        local = [];
      }
      const guestItems = owner === '' ? local : [];
      const next = guestItems.length ? mergeCarts(saved, guestItems) : saved;
      writeOwner(userId);
      fromServer.current = !guestItems.length;
      setItems(next);
      setSynced(true);
      if (guestItems.length) push(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [hydrated, status, userId, pull, push]);

  // Save each change to the account (a moment later, so quick +/- taps send one update).
  useEffect(() => {
    if (!userId || !synced) return;
    if (fromServer.current) {
      fromServer.current = false;
      return;
    }
    pending.current = items;
    if (pushTimer.current) clearTimeout(pushTimer.current);
    pushTimer.current = setTimeout(() => {
      pushTimer.current = null;
      push(items);
    }, PUSH_DELAY_MS);
  }, [items, userId, synced, push]);

  // Leaving or reloading the page straight after a change still saves it.
  useEffect(() => {
    const flush = () => {
      if (!pending.current) return;
      if (pushTimer.current) clearTimeout(pushTimer.current);
      pushTimer.current = null;
      push(pending.current);
    };
    window.addEventListener('pagehide', flush);
    return () => window.removeEventListener('pagehide', flush);
  }, [push]);

  // Coming back to the tab picks up changes made on the phone (or another browser).
  useEffect(() => {
    if (!userId || !synced) return;
    const refresh = async () => {
      if (document.visibilityState !== 'visible' || pending.current) return;
      const saved = await pull();
      if (saved === null) return;
      setItems((cur) => {
        if (JSON.stringify(cur) === JSON.stringify(saved)) return cur;
        fromServer.current = true;
        return saved;
      });
    };
    document.addEventListener('visibilitychange', refresh);
    window.addEventListener('focus', refresh);
    return () => {
      document.removeEventListener('visibilitychange', refresh);
      window.removeEventListener('focus', refresh);
    };
  }, [userId, synced, pull]);

  const addItem = (product: Product, quantity = 1, options: { color?: string; size?: string } = {}) => {
    const key = cartLineKey({ productId: product.id, ...options });
    setItems((prev) => {
      // Never hold more than the vendor has in stock (summed over every colour/size line of the product).
      if (product.stock !== undefined) {
        const inCart = prev.filter((i) => i.productId === product.id).reduce((n, i) => n + i.quantity, 0);
        quantity = Math.min(quantity, product.stock - inCart);
        if (quantity <= 0) return prev;
      }
      const existing = prev.find((item) => cartLineKey(item) === key);
      if (existing) {
        return prev.map((item) =>
          cartLineKey(item) === key ? { ...item, quantity: item.quantity + quantity, ...(product.stock !== undefined ? { maxQuantity: product.stock } : {}) } : item
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          vendorId: product.vendorId,
          name: product.name,
          price: product.discountPrice ?? product.price,
          quantity,
          imageUrl: product.imageUrl,
          aiHint: product.aiHint,
          ...(options.color ? { color: options.color } : {}),
          ...(options.size ? { size: options.size } : {}),
          ...(product.stock !== undefined ? { maxQuantity: product.stock } : {}),
        },
      ];
    });
  };

  const updateQuantity = (lineKey: string, quantity: number) => {
    setItems((prev) =>
      prev
        .map((item) => {
          if (cartLineKey(item) !== lineKey) return item;
          if (item.maxQuantity === undefined) return { ...item, quantity };
          const otherLines = prev.filter((i) => i.productId === item.productId && cartLineKey(i) !== lineKey).reduce((n, i) => n + i.quantity, 0);
          return { ...item, quantity: Math.min(quantity, Math.max(0, item.maxQuantity - otherLines)) };
        })
        .filter((item) => item.quantity > 0)
    );
  };

  const removeItem = (lineKey: string) => {
    setItems((prev) => prev.filter((item) => cartLineKey(item) !== lineKey));
  };

  const clear = () => setItems([]);

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <CartContext.Provider value={{ items, addItem, updateQuantity, removeItem, clear, subtotal, itemCount }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within a CartProvider');
  return ctx;
}
