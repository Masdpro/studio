'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { track } from '@/lib/track';

/** Records one page_view per client-side navigation (admin pages excluded). */
export function PageViewTracker() {
  const pathname = usePathname();
  useEffect(() => {
    if (pathname.startsWith('/admin')) return;
    track('page_view', { path: pathname });
  }, [pathname]);
  return null;
}
