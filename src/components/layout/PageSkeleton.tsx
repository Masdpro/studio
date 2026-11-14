import { Skeleton } from '@/components/ui/skeleton';

/**
 * Shown the moment someone switches between Shop and Book (or opens either side) while the page is still
 * on its way, so the screen always reacts at once. It follows the shape of both home pages: filters, then cards.
 */
export function PageSkeleton({ label }: { label: string }) {
  return (
    <div className="container mx-auto px-4 pb-8 pt-2 md:px-6 md:pt-3" aria-busy="true" aria-label={label}>
      <div className="mb-8 space-y-4 rounded-xl border bg-card p-4 md:p-5">
        <div className="grid gap-4 md:grid-cols-[1fr_1fr_auto]">
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="hidden h-10 w-10 rounded-lg md:block" />
        </div>
        <div className="flex gap-2 overflow-hidden">
          {Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-8 w-24 shrink-0 rounded-full" />)}
        </div>
      </div>
      <Skeleton className="mb-6 h-7 w-56" />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="overflow-hidden rounded-xl border bg-card">
            <Skeleton className="aspect-[4/3] w-full rounded-none" />
            <div className="space-y-2 p-3">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-9 w-full rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
