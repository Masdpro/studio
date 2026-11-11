'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Menu } from 'lucide-react';
import { Sheet, SheetClose, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { SHOP_PATH } from '@/lib/site';

const NAV = [
  { href: '/#how-it-works', label: 'How it works' },
  { href: '/#why', label: 'Why Closebuy' },
  { href: '/#earn', label: 'Earn with us' },
  { href: '/#faq', label: 'FAQ' },
  { href: '/contact', label: 'Contact' },
];

export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={cn(
        'sticky top-0 z-40 transition-[background-color,box-shadow,border-color] duration-300',
        scrolled
          ? 'border-b border-[hsl(var(--ink)/0.08)] bg-[hsl(var(--cream)/0.82)] shadow-[0_8px_30px_-12px_hsl(var(--ink)/0.18)] backdrop-blur-xl'
          : 'border-b border-transparent bg-transparent',
      )}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6 md:h-[72px]">
        <Link href="/" className="flex items-center gap-1.5" aria-label="Closebuy home">
          <Image src="/logo-mark-orange.png" alt="" width={26} height={34} unoptimized className="block" />
          <span className="font-display text-2xl font-bold text-[hsl(var(--coral-deep))]">Closebuy</span>
        </Link>

        <nav className="ml-8 hidden items-center gap-1 lg:flex" aria-label="Main">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="rounded-full px-3.5 py-2 text-sm font-medium text-[hsl(var(--ink)/0.72)] transition-colors hover:bg-[hsl(var(--ink)/0.06)] hover:text-[hsl(var(--ink))]"
            >
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <Link
            href="/auth/login"
            className="hidden rounded-full px-4 py-2 text-sm font-semibold text-[hsl(var(--ink))] transition-colors hover:bg-[hsl(var(--ink)/0.06)] sm:inline-flex"
          >
            Sign in
          </Link>
          <Link
            href={SHOP_PATH}
            className="group hidden items-center gap-1.5 rounded-full bg-[hsl(var(--ink))] px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[hsl(var(--ink)/0.2)] transition-transform hover:-translate-y-0.5 sm:inline-flex"
          >
            Start shopping
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>

          <Sheet>
            <SheetTrigger asChild>
              <button
                type="button"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[hsl(var(--ink)/0.12)] bg-white/60 lg:hidden"
                aria-label="Open menu"
              >
                <Menu className="h-5 w-5" />
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="site-root flex w-[86vw] max-w-sm flex-col border-l-0 bg-[hsl(var(--cream))] p-6">
              <SheetTitle className="font-display text-2xl font-bold text-[hsl(var(--coral-deep))]">Closebuy</SheetTitle>
              <nav className="mt-6 flex flex-col" aria-label="Mobile">
                {NAV.map((n) => (
                  <SheetClose asChild key={n.href}>
                    <Link href={n.href} className="font-display border-b border-[hsl(var(--ink)/0.08)] py-4 text-xl font-semibold">
                      {n.label}
                    </Link>
                  </SheetClose>
                ))}
              </nav>
              <div className="mt-auto grid gap-3 pt-8">
                <SheetClose asChild>
                  <Link href={SHOP_PATH} className="bg-coral-gradient flex items-center justify-center gap-2 rounded-full py-3.5 font-semibold text-white">
                    Start shopping <ArrowRight className="h-4 w-4" />
                  </Link>
                </SheetClose>
                <SheetClose asChild>
                  <Link href="/auth/login" className="flex items-center justify-center rounded-full border border-[hsl(var(--ink)/0.15)] py-3.5 font-semibold">
                    Sign in
                  </Link>
                </SheetClose>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
