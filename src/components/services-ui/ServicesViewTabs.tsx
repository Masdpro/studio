'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Sparkles, Users } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

export type ServicesView = 'services' | 'pros';
export const parseServicesView = (v: string | null): ServicesView => (v === 'pros' ? 'pros' : 'services');

/** The services home's "Browse Services / Professionals" switcher: the twin of the shop's Products / Markets tabs. */
export function ServicesViewTabs({ className }: { className?: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const view = parseServicesView(useSearchParams().get('view'));
  if (pathname !== '/services') return null;

  return (
    <Tabs value={view} onValueChange={(next) => router.replace(next === 'pros' ? '/services?view=pros' : '/services', { scroll: false })} className={className}>
      <TabsList className="h-9 w-full bg-muted p-1">
        <TabsTrigger value="services" className="flex-1 px-2.5 text-xs sm:px-3 sm:text-sm">
          <Sparkles className="mr-1.5 hidden h-3.5 w-3.5 lg:inline" />
          <span className="lg:hidden">Services</span>
          <span className="hidden lg:inline">Browse Services</span>
        </TabsTrigger>
        <TabsTrigger value="pros" className="flex-1 px-2.5 text-xs sm:px-3 sm:text-sm">
          <Users className="mr-1.5 hidden h-3.5 w-3.5 lg:inline" />
          Professionals
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
