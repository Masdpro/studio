'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ClipboardList, Home, ListChecks, ShoppingCart } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import { cn } from '@/lib/utils';

/** Pages that bring their own bottom tab bar on phones (so the main one steps aside). */
const OWN_TAB_BAR = ['/vendor/dashboard'];

/** True when the phone bottom tab bar is shown on this page. */
export function useShowsBottomNav() {
  const pathname = usePathname();
  const { role } = useAuth();
  return role !== 'admin' && !OWN_TAB_BAR.includes(pathname);
}

/** Asks the header to open the cart drawer. */
export const openCart = () => window.dispatchEvent(new Event('cart:open'));

/**
 * App-style tab bar along the bottom of the screen on phones: Home, Orders, Cart and Errands.
 * Hidden on tablets and computers, which use the side menu instead.
 */
export function MobileBottomNav() {
  const pathname = usePathname();
  const { itemCount } = useCart();
  const shows = useShowsBottomNav();
  if (!shows) return null;

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  const itemClass = (active: boolean) =>
    cn(
      'relative flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors',
      active ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
    );

  const links = [
    { href: '/shop', label: 'Home', icon: Home },
    { href: '/orders', label: 'Orders', icon: ListChecks },
  ];

  return (
    <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
      <div className="grid grid-cols-4">
        {links.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} aria-current={isActive(href) ? 'page' : undefined} className={itemClass(isActive(href))}>
            <Icon className="h-5 w-5" />
            {label}
          </Link>
        ))}
        <button type="button" onClick={openCart} className={itemClass(false)}>
          <span className="relative">
            <ShoppingCart className="h-5 w-5" />
            {itemCount > 0 && (
              <span className="absolute -right-2.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] leading-none text-destructive-foreground">
                {itemCount}
              </span>
            )}
          </span>
          Cart
        </button>
        <Link href="/errands" aria-current={isActive('/errands') ? 'page' : undefined} className={itemClass(isActive('/errands'))}>
          <ClipboardList className="h-5 w-5" />
          Errands
        </Link>
      </div>
    </nav>
  );
}
