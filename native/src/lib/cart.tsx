import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { CartItem, Product } from './types';

const KEY = 'closebuy.cart';
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
