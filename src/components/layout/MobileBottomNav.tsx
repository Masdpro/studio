'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ClipboardList, Home, ListChecks, ShoppingCart } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import { cn } from '@/lib/utils';

/**
 * Work areas where the shopping tab bar steps aside: every vendor, branch and delivery-agent page.
 * (The vendor dashboard brings its own bottom tabs; the rest are reached from the account menu.)
 */
const WORK_AREAS = ['/vendor', '/branch', '/delivery-agent', '/delivery'];

export function isWorkArea(pathname: string | null): boolean {
  if (!pathname) return false;
  return WORK_AREAS.some((base) => pathname === base || pathname.startsWith(`${base}/`));
}

/** True when the phone bottom tab bar is shown on this page. */
export function useShowsBottomNav() {
  const pathname = usePathname();
  const { role } = useAuth();
  return role !== 'admin' && !isWorkArea(pathname);
}

/**
 * True while the page is being scrolled; turns false shortly after scrolling stops.
 * Used to slide the phone tab bars out of the way, like mobile apps do.
 */
export function useScrolling(settleMs = 350) {
  const [scrolling, setScrolling] = useState(false);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const onScroll = () => {
      setScrolling(true);
      clearTimeout(timer);
      timer = setTimeout(() => setScrolling(false), settleMs);
    };
    // Capture so scrolling inside the main content area (not just the window) counts too.
    document.addEventListener('scroll', onScroll, { capture: true, passive: true });
    return () => {
      clearTimeout(timer);
      document.removeEventListener('scroll', onScroll, { capture: true });
    };
  }, [settleMs]);
  return scrolling;
}

/** Classes that slide a floating bottom bar away while scrolling. */
export const hideWhileScrolling = (scrolling: boolean) =>
  cn('transition-[transform,opacity] duration-300 ease-out', scrolling ? 'pointer-events-none translate-y-[calc(100%+1.5rem)] opacity-0' : 'translate-y-0 opacity-100');

/**
 * App-style tab bar on phones: a floating, frosted-glass pill with Home, Orders, Cart and Errands.
 * Hidden on tablets and computers, which use the side menu instead.
 */
export function MobileBottomNav() {
  const pathname = usePathname();
  const { itemCount } = useCart();
  const shows = useShowsBottomNav();
  const scrolling = useScrolling();
  if (!shows) return null;

  const items = [
    { href: '/shop', label: 'Home', icon: Home },
    { href: '/orders', label: 'Orders', icon: ListChecks },
    { href: '/cart', label: 'Cart', icon: ShoppingCart, badge: itemCount },
    { href: '/errands', label: 'Errands', icon: ClipboardList },
  ];
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <nav
      aria-label="Main"
      className={cn(
        hideWhileScrolling(scrolling),
        'fixed inset-x-3 z-40 rounded-[1.75rem] border border-white/40 bg-background/60 shadow-[0_8px_30px_rgba(0,0,0,0.12)] backdrop-blur-xl backdrop-saturate-150 supports-[backdrop-filter]:bg-background/50 md:hidden',
      )}
      style={{ bottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}
    >
      <div className="grid grid-cols-4 p-1.5">
        {items.map(({ href, label, icon: Icon, badge }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex h-14 flex-col items-center justify-center gap-0.5 rounded-[1.25rem] text-[11px] font-medium transition-colors',
                active ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <span className="relative">
                <Icon className="h-5 w-5" />
                {!!badge && badge > 0 && (
                  <span className="absolute -right-2.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] leading-none text-destructive-foreground">
                    {badge}
                  </span>
                )}
              </span>
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
