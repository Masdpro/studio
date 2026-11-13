'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { CalendarCheck, ShoppingBag, Sparkles, UserRound } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';

/** Turns on the dark services look for the whole page (dialogs included) while a services page is open. */
export function ServicesThemeOn() {
  useEffect(() => {
    const html = document.documentElement;
    html.classList.add('svc-theme', 'dark');
    return () => html.classList.remove('svc-theme', 'dark');
  }, []);
  return null;
}

/**
 * The Shop / Services toggle that sits beside the logo on both sides of Closebuy.
 * The knob slides across, then we move to the other side.
 */
export function SideToggle({ active, className }: { active: 'products' | 'services'; className?: string }) {
  const router = useRouter();
  const [on, setOn] = useState(active === 'services');
  const target = active === 'services' ? '/shop' : '/services';
  useEffect(() => { router.prefetch(target); }, [router, target]);
  useEffect(() => { setOn(active === 'services'); }, [active]);

  const flip = () => {
    setOn((v) => !v);
    window.setTimeout(() => router.push(target), 180);
  };

  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={active === 'services' ? 'Switch to shopping for products' : 'Switch to booking services'}
      onClick={flip}
      className={cn(
        'relative grid h-7 shrink-0 grid-cols-2 items-center rounded-full border p-0.5 text-[11px] font-semibold sm:h-8 sm:text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        on ? 'border-[hsl(39_64%_63%/0.35)] bg-[hsl(228_24%_12%)]' : 'border-border bg-muted',
        className,
      )}
    >
      {/* The sliding knob */}
      <span
        aria-hidden
        className={cn(
          'absolute bottom-0.5 left-0.5 top-0.5 w-[calc(50%-2px)] rounded-full shadow-sm transition-transform duration-200 ease-out',
          on ? 'translate-x-full bg-[linear-gradient(135deg,hsl(42_76%_70%),hsl(36_58%_54%))]' : 'translate-x-0 bg-primary',
        )}
      />
      <span className={cn('relative z-10 flex items-center justify-center gap-1 px-1.5 transition-colors min-[400px]:px-2 sm:px-2.5 duration-200', on ? 'text-[hsl(220_10%_62%)]' : 'text-primary-foreground')}>
        <ShoppingBag className="hidden h-3.5 w-3.5 min-[400px]:block" />Shop
      </span>
      <span className={cn('relative z-10 flex items-center justify-center gap-1 px-1.5 transition-colors min-[400px]:px-2 sm:px-2.5 duration-200', on ? 'text-[hsl(228_30%_8%)]' : 'text-muted-foreground')}>
        <Sparkles className="hidden h-3.5 w-3.5 min-[400px]:block" />Services
      </span>
    </button>
  );
}

export function ServicesHeader() {
  const { user } = useAuth();
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4">
        <Link href="/services" className="flex items-center gap-2">
          <Image src="/logo-mark-orange.png" alt="" width={24} height={31} unoptimized />
          <span className="svc-display hidden text-lg font-semibold leading-none sm:inline">
            Closebuy <span className="svc-gold-text">Services</span>
          </span>
        </Link>
        <SideToggle active="services" />
        <div className="ml-auto flex items-center gap-1">
          <Link href="/bookings" className="flex items-center gap-1.5 rounded-full px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground">
            <CalendarCheck className="h-4 w-4" /><span className="hidden md:inline">My bookings</span>
          </Link>
          <Link href={user ? '/profile' : '/auth/login?callbackUrl=/services'} className="flex h-9 w-9 items-center justify-center rounded-full border border-border hover:border-primary/60" aria-label={user ? 'Your account' : 'Sign in'}>
            {user?.name ? <span className="text-sm font-semibold">{user.name.slice(0, 1).toUpperCase()}</span> : <UserRound className="h-4 w-4" />}
          </Link>
        </div>
      </div>
    </header>
  );
}
