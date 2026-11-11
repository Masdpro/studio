'use client';

import type { Product } from '@/lib/types';
import { cn } from '@/lib/utils';

export type ProductSelection = { color?: string; size?: string };

/** True when the vendor lists colours or sizes, so a choice is needed before adding to cart. */
export const hasOptions = (p: Pick<Product, 'colors' | 'sizes'>) => !!(p.colors?.length || p.sizes?.length);

/** True once every offered option (colour and/or size) has been picked. */
export const selectionComplete = (p: Pick<Product, 'colors' | 'sizes'>, s: ProductSelection) =>
  (!p.colors?.length || !!s.color) && (!p.sizes?.length || !!s.size);

const eq = (a: string, b?: string) => !!b && a.toLowerCase() === b.toLowerCase();

/**
 * Units left for a (possibly partial) choice when the vendor counts stock per colour/size, or
 * undefined when that doesn't apply (then the product's overall stock is what counts).
 */
export function stockForSelection(p: Pick<Product, 'variantStock'>, s: ProductSelection): number | undefined {
  const v = p.variantStock;
  if (!v?.length) return undefined;
  const byColor = v.some((r) => r.color !== '');
  const bySize = v.some((r) => r.size !== '');
  return v
    .filter((r) => (!byColor || !s.color || eq(r.color, s.color)) && (!bySize || !s.size || eq(r.size, s.size)))
    .reduce((n, r) => n + r.quantity, 0);
}

function Group({ label, options, value, onPick, soldOut }: { label: string; options: string[]; value?: string; onPick: (v: string) => void; soldOut: (o: string) => boolean }) {
  return (
    <div className="space-y-1.5">
      <p className="text-sm font-medium">{label}{value ? <span className="ml-1 font-normal text-muted-foreground">: {value}</span> : null}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => {
          const out = soldOut(o);
          return (
            <button
              key={o}
              type="button"
              aria-pressed={value === o}
              disabled={out}
              title={out ? `${o} is sold out` : undefined}
              onClick={() => onPick(o)}
              className={cn(
                'rounded-full border px-3 py-1 text-sm transition-colors',
                value === o ? 'border-primary bg-primary text-primary-foreground' : 'hover:bg-muted',
                out && 'cursor-not-allowed border-dashed text-muted-foreground line-through opacity-60 hover:bg-transparent'
              )}
            >
              {o}
              {out && <span className="sr-only"> (sold out)</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Colour / size chips for a product that offers them. */
export function ProductOptionsPicker({ product, value, onChange }: { product: Pick<Product, 'colors' | 'sizes' | 'variantStock'>; value: ProductSelection; onChange: (v: ProductSelection) => void }) {
  if (!hasOptions(product)) return null;
  // A colour is sold out if none is left in the chosen size (or in any size, before one is chosen), and the other way round.
  const colorOut = (color: string) => stockForSelection(product, { color, size: value.size }) === 0;
  const sizeOut = (size: string) => stockForSelection(product, { color: value.color, size }) === 0;
  const left = selectionComplete(product, value) ? stockForSelection(product, value) : undefined;
  return (
    <div className="space-y-3">
      {!!product.colors?.length && <Group label="Color" options={product.colors} value={value.color} soldOut={colorOut} onPick={(color) => onChange({ ...value, color, size: value.size && stockForSelection(product, { color, size: value.size }) === 0 ? undefined : value.size })} />}
      {!!product.sizes?.length && <Group label="Size" options={product.sizes} value={value.size} soldOut={sizeOut} onPick={(size) => onChange({ ...value, size })} />}
      {left !== undefined && left > 0 && left <= 5 && <p className="text-sm font-medium text-amber-600">Only {left} left in this option</p>}
    </div>
  );
}
