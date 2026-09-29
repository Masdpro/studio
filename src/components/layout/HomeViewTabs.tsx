'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ShoppingBag, Store } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

export type HomeView = 'products' | 'markets';

export function parseHomeView(value: string | null): HomeView {
  return value === 'markets' ? 'markets' : 'products';
}

/**
 * The homepage's "Browse Products / Local Markets" switcher, shown in the top
 * header (home page only). The choice lives in the URL (?view=markets) so the
 * page below can react to it and the view survives a refresh or shared link.
 */
export function HomeViewTabs({ className }: { className?: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const view = parseHomeView(useSearchParams().get('view'));

  if (pathname !== '/') return null;

  return (
    <Tabs
      value={view}
      onValueChange={(next) => router.replace(next === 'markets' ? '/?view=markets' : '/', { scroll: false })}
      className={className}
    >
      <TabsList className="h-9 bg-muted p-1">
        <TabsTrigger value="products" className={cn('px-2.5 text-xs sm:px-3 sm:text-sm')}>
          <ShoppingBag className="mr-1.5 hidden h-3.5 w-3.5 lg:inline" />
          <span className="lg:hidden">Products</span>
          <span className="hidden lg:inline">Browse Products</span>
        </TabsTrigger>
        <TabsTrigger value="markets" className={cn('px-2.5 text-xs sm:px-3 sm:text-sm')}>
          <Store className="mr-1.5 hidden h-3.5 w-3.5 lg:inline" />
          <span className="lg:hidden">Markets</span>
          <span className="hidden lg:inline">Local Markets</span>
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
