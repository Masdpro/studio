'use client';

import type { ReactNode } from 'react';
import { Info } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

/**
 * A small (i) next to a heading that opens its explanation on tap (or click), so pages keep
 * short headings instead of paragraphs of help text. Works on phones, where hover tooltips don't.
 */
export function InfoTip({ children, label = 'More info', className }: { children: ReactNode; label?: string; className?: string }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={label}
          onClick={(e) => e.stopPropagation()}
          className={cn('ml-1.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full align-middle text-muted-foreground transition-colors hover:bg-muted hover:text-foreground', className)}
        >
          <Info className="h-4 w-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent side="bottom" align="start" className="w-[min(18rem,calc(100vw-2rem))] rounded-xl p-3 text-sm font-normal leading-relaxed text-muted-foreground">
        {children}
      </PopoverContent>
    </Popover>
  );
}
