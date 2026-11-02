'use client';

import type { Product } from '@/lib/types';
import { cn } from '@/lib/utils';

export type ProductSelection = { color?: string; size?: string };

/** True when the vendor lists colours or sizes, so a choice is needed before adding to cart. */
export const hasOptions = (p: Pick<Product, 'colors' | 'sizes'>) => !!(p.colors?.length || p.sizes?.length);

/** True once every offered option (colour and/or size) has been picked. */
export const selectionComplete = (p: Pick<Product, 'colors' | 'sizes'>, s: ProductSelection) =>
  (!p.colors?.length || !!s.color) && (!p.sizes?.length || !!s.size);

function Group({ label, options, value, onPick }: { label: string; options: string[]; value?: string; onPick: (v: string) => void }) {
  return (
    <div className="space-y-1.5">
      <p className="text-sm font-medium">{label}{value ? <span className="ml-1 font-normal text-muted-foreground">: {value}</span> : null}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <button
            key={o}
            type="button"
            aria-pressed={value === o}
            onClick={() => onPick(o)}
            className={cn(
              'rounded-full border px-3 py-1 text-sm transition-colors',
              value === o ? 'border-primary bg-primary text-primary-foreground' : 'hover:bg-muted'
            )}
          >
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Colour / size chips for a product that offers them. */
export function ProductOptionsPicker({ product, value, onChange }: { product: Pick<Product, 'colors' | 'sizes'>; value: ProductSelection; onChange: (v: ProductSelection) => void }) {
  if (!hasOptions(product)) return null;
  return (
    <div className="space-y-3">
      {!!product.colors?.length && <Group label="Color" options={product.colors} value={value.color} onPick={(color) => onChange({ ...value, color })} />}
      {!!product.sizes?.length && <Group label="Size" options={product.sizes} value={value.size} onPick={(size) => onChange({ ...value, size })} />}
    </div>
  );
}
