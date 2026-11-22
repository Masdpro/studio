'use client';

import { useState, type ReactNode } from 'react';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

/**
 * The home pages' search: one search box with a filter button inside it on the right.
 * The button opens a pop-up holding the other filters (area, vendor or professional, category);
 * a badge on it shows how many are switched on.
 */
export function SearchWithFilters({
  value,
  onChange,
  placeholder,
  label,
  activeCount,
  onClear,
  resultLabel,
  children,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  /** What the box searches, for screen readers, e.g. "Search products, markets and vendors". */
  label: string;
  activeCount: number;
  onClear: () => void;
  /** The pop-up's main button, e.g. "Show 24 items". */
  resultLabel: string;
  children: ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className={cn('mb-8', className)}>
      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input
          type="search"
          aria-label={label}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cn('h-12 w-full appearance-none rounded-xl border-border bg-background pl-12 text-base shadow-sm focus-visible:ring-primary [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden', value ? 'pr-24' : 'pr-14')}
        />
        <div className="absolute right-1.5 top-1/2 flex -translate-y-1/2 items-center gap-1">
          {value && (
            <button type="button" aria-label="Clear search" onClick={() => onChange('')} className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted">
              <X className="h-4 w-4" />
            </button>
          )}
          <button
            type="button"
            aria-label={activeCount ? `Filters, ${activeCount} on` : 'Filters'}
            aria-haspopup="dialog"
            onClick={() => setOpen(true)}
            className={cn(
              'relative flex h-9 w-9 items-center justify-center rounded-lg transition-colors',
              activeCount ? 'bg-primary text-primary-foreground' : 'text-foreground hover:bg-muted',
            )}
          >
            <SlidersHorizontal className="h-4 w-4" />
            {activeCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-foreground px-1 text-[10px] font-bold leading-none text-background">
                {activeCount}
              </span>
            )}
          </button>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        {/* Don't jump into the first filter: that would pop its list open before the person picks anything. */}
        <DialogContent onOpenAutoFocus={(e) => e.preventDefault()} className="max-h-[85vh] w-[calc(100vw-2rem)] max-w-lg overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><SlidersHorizontal className="h-5 w-5 text-primary" />Filters</DialogTitle>
            <DialogDescription>Narrow down what you see.</DialogDescription>
          </DialogHeader>
          <div className="space-y-5">{children}</div>
          <DialogFooter className="flex-row gap-2 sm:justify-between">
            <Button type="button" variant="ghost" onClick={onClear} disabled={!activeCount} className="flex-1 sm:flex-none">Clear all</Button>
            <Button type="button" onClick={() => setOpen(false)} className="flex-1 sm:flex-none">{resultLabel}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** One labelled group inside the filter pop-up. */
export function FilterField({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <div>
      <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">{icon}{title}</h3>
      {children}
    </div>
  );
}

/** Every choice as a wrapping row of chips (the pop-up has room for all of them). */
export function ChipChoice({ items, selected, onSelect }: { items: string[]; selected: string; onSelect: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <button
          key={item}
          type="button"
          aria-pressed={selected === item}
          onClick={() => onSelect(item)}
          className={cn(
            'rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
            selected === item ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card hover:border-primary/60',
          )}
        >
          {item}
        </button>
      ))}
    </div>
  );
}
