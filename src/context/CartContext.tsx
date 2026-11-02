'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import type { CartItem, Product } from '@/lib/types';
import { cartLineKey } from '@/lib/cart-line';

const STORAGE_KEY = 'closebuy-cart';

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
