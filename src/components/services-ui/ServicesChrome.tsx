'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

/** Turns on the dark services look for the whole page (dialogs included) while a services page is open. */
export function ServicesThemeOn() {
  useEffect(() => {
    const html = document.documentElement;
    html.classList.add('svc-theme', 'dark');
    return () => html.classList.remove('svc-theme', 'dark');
  }, []);
  // Also switch it on before the page first paints, so a fresh load doesn't flash the light shop colours.
  return <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('svc-theme','dark')" }} />;
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
      <span className={cn('relative z-10 flex items-center justify-center px-3 transition-colors duration-200', on ? 'text-[hsl(220_10%_62%)]' : 'text-primary-foreground')}>
        Shop
      </span>
      <span className={cn('relative z-10 flex items-center justify-center px-3 transition-colors duration-200', on ? 'text-[hsl(228_30%_8%)]' : 'text-muted-foreground')}>
        Services
      </span>
    </button>
  );
}
