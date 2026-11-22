'use client';

import { useState, type ReactNode } from 'react';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet';
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

      <Sheet open={open} onOpenChange={setOpen}>
        {/* Don't jump into the first filter: that would pop its list open before the person picks anything. */}
        <SheetContent
          side="bottom"
          onOpenAutoFocus={(e) => e.preventDefault()}
          className="mx-auto flex max-h-[88dvh] w-full max-w-lg flex-col gap-0 rounded-t-[1.75rem] p-0 pb-[env(safe-area-inset-bottom)]"
        >
          <div aria-hidden className="mx-auto mt-2.5 h-1.5 w-10 shrink-0 rounded-full bg-muted-foreground/25" />
          <div className="flex shrink-0 items-center gap-3 px-5 pb-3 pr-14 pt-3">
            <SheetTitle className="text-lg font-bold">Filters</SheetTitle>
            <SheetDescription className="sr-only">Narrow down what you see.</SheetDescription>
            {activeCount > 0 && (
              <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs font-semibold text-primary">{activeCount} on</span>
            )}
            <button
              type="button"
              onClick={onClear}
              disabled={!activeCount}
              className="ml-auto text-sm font-semibold text-primary disabled:text-muted-foreground/50"
            >
              Clear all
            </button>
          </div>
          <div className="min-h-0 flex-1 divide-y divide-border/70 overflow-y-auto border-y border-border/70 px-5">{children}</div>
          <div className="shrink-0 px-5 py-3">
            <Button type="button" onClick={() => setOpen(false)} className="h-12 w-full rounded-xl text-base font-semibold">{resultLabel}</Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

/** One labelled section inside the filter sheet. */
export function FilterField({ icon, title, children }: { icon?: ReactNode; title: string; children: ReactNode }) {
  return (
    <section className="py-4">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground [&_svg]:h-4 [&_svg]:w-4 [&_svg]:text-muted-foreground">{icon}{title}</h3>
      {children}
    </section>
  );
}

/** Two or three exclusive options as a full-width segmented control (e.g. Products | Markets). */
export function SegmentedChoice({ items, selected, onSelect }: { items: string[]; selected: string; onSelect: (v: string) => void }) {
  return (
    <div role="radiogroup" className="grid gap-1 rounded-xl bg-muted p-1" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
      {items.map((item) => (
        <button
          key={item}
          type="button"
          role="radio"
          aria-checked={selected === item}
          onClick={() => onSelect(item)}
          className={cn(
            'h-10 rounded-lg text-sm font-semibold transition-colors',
            selected === item ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {item}
        </button>
      ))}
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
            'h-9 rounded-full border px-3.5 text-sm font-medium transition-colors',
            selected === item ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-background hover:border-primary/60',
          )}
        >
          {item}
        </button>
      ))}
    </div>
  );
}
