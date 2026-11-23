
'use client';

import { SafeImage } from '@/components/ui/safe-image';
import type { CartItem as CartItemType } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cartLineKey } from '@/lib/cart-line';
import { MinusCircle, PlusCircle, Trash2 } from 'lucide-react';

interface CartItemProps {
  item: CartItemType;
  onQuantityChange: (productId: string, quantity: number) => void;
  onRemove: (productId: string) => void;
}

export function CartItem({ item, onQuantityChange, onRemove }: CartItemProps) {
  const lineKey = cartLineKey(item);
  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newQuantity = parseInt(e.target.value, 10);
    if (!isNaN(newQuantity) && newQuantity >= 0) {
      onQuantityChange(lineKey, newQuantity);
    }
  };

  const incrementQuantity = () => {
    onQuantityChange(lineKey, item.quantity + 1);
  };

  const decrementQuantity = () => {
    if (item.quantity > 0) {
      onQuantityChange(lineKey, item.quantity - 1);
    }
  };

  // One compact row, like a shopping app: photo on the left, details and controls beside it.
  return (
    <div className="flex gap-3 border-b px-3 py-3 sm:gap-4 sm:p-4">
      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-muted sm:h-24 sm:w-24">
        <SafeImage
          src={item.imageUrl || "https://placehold.co/96x96.png"}
          alt={item.name}
          fill={true}
          style={{ objectFit: 'cover' }}
          data-ai-hint={item.aiHint || "product item"}
          sizes="96px"
        />
      </div>

      <div className="flex min-w-0 flex-1 flex-col justify-between gap-1.5">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="line-clamp-2 text-sm font-semibold leading-snug sm:text-base">{item.name}</h3>
            {(item.color || item.size) && (
              <p className="truncate text-xs text-muted-foreground">{[item.color, item.size].filter(Boolean).join(' · ')}</p>
            )}
            <p className="text-xs text-muted-foreground">₦{item.price.toLocaleString()} each</p>
          </div>
          <Button variant="ghost" size="icon" aria-label={`Remove ${item.name}`} className="-mr-1 -mt-1 h-8 w-8 shrink-0 text-destructive hover:text-destructive/80" onClick={() => onRemove(lineKey)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center rounded-full border bg-background">
            <Button variant="ghost" size="icon" aria-label="One less" onClick={decrementQuantity} disabled={item.quantity <= 0} className="h-8 w-8 rounded-full">
              <MinusCircle className="h-4 w-4" />
            </Button>
            <Input
              type="number"
              aria-label="Quantity"
              value={item.quantity}
              onChange={handleQuantityChange}
              className="h-8 w-9 border-0 bg-transparent p-0 text-center text-sm shadow-none focus-visible:ring-0 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
              min="0"
            />
            <Button variant="ghost" size="icon" aria-label="One more" onClick={incrementQuantity} className="h-8 w-8 rounded-full">
              <PlusCircle className="h-4 w-4" />
            </Button>
          </div>
          <p className="whitespace-nowrap text-base font-bold text-primary">₦{(item.price * item.quantity).toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
}
