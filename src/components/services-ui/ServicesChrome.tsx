'use client';

import { useEffect } from 'react';
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

/** The Products | Services switch, shared by the shop and the services side. */
export function SideSwitch({ active, className }: { active: 'products' | 'services'; className?: string }) {
  const item = (key: 'products' | 'services', href: string, label: string, Icon: typeof ShoppingBag) => (
    <Link
      href={href}
      aria-current={active === key ? 'page' : undefined}
      className={cn(
        'flex flex-1 items-center justify-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-colors',
        active === key
          ? key === 'services' ? 'svc-gold-btn shadow-sm' : 'bg-primary text-primary-foreground shadow-sm'
          : 'text-muted-foreground hover:text-foreground',
      )}
    >
      <Icon className="h-3.5 w-3.5" />{label}
    </Link>
  );
  return (
    <nav aria-label="Switch between products and services" className={cn('flex rounded-full border border-border bg-muted/60 p-1', className)}>
      {item('products', '/shop', 'Products', ShoppingBag)}
      {item('services', '/services', 'Services', Sparkles)}
    </nav>
  );
}

export function ServicesHeader() {
  const { user } = useAuth();
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4">
        <Link href="/services" className="flex items-center gap-2">
          <Image src="/logo-mark-orange.png" alt="" width={24} height={31} unoptimized />
          <span className="svc-display text-lg font-semibold leading-none">
            Closebuy <span className="svc-gold-text">Services</span>
          </span>
        </Link>
        <SideSwitch active="services" className="mx-auto hidden w-64 sm:flex" />
        <div className="ml-auto flex items-center gap-1 sm:ml-0">
          <Link href="/bookings" className="flex items-center gap-1.5 rounded-full px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground">
            <CalendarCheck className="h-4 w-4" /><span className="hidden md:inline">My bookings</span>
          </Link>
          <Link href={user ? '/profile' : '/auth/login?callbackUrl=/services'} className="flex h-9 w-9 items-center justify-center rounded-full border border-border hover:border-primary/60" aria-label={user ? 'Your account' : 'Sign in'}>
            {user?.name ? <span className="text-sm font-semibold">{user.name.slice(0, 1).toUpperCase()}</span> : <UserRound className="h-4 w-4" />}
          </Link>
        </div>
      </div>
      <div className="border-t border-border/60 px-4 py-2 sm:hidden">
        <SideSwitch active="services" />
      </div>
    </header>
  );
}
